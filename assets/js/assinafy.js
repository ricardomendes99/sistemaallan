// Assinafy integration — all API calls go through /assinafy-proxy/ (nginx adds the API key)
const Assinafy = (() => {
  const PROXY = '/assinafy-proxy';

  function _accountId() {
    return window.ASSINAFY_ACCOUNT_ID || '';
  }

  async function _request(method, path, body, isFormData) {
    const opts = { method, headers: {} };
    if (body) {
      if (isFormData) {
        opts.body = body; // FormData — browser sets Content-Type with boundary
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(`${PROXY}${path}`, opts);
    const json = await res.json().catch(() => ({ status: res.status, message: 'Resposta inválida da API' }));
    if (!res.ok || json.status >= 400) {
      throw new Error(json.message || `Erro ${res.status}`);
    }
    return json.data;
  }

  // Upload PDF blob and return document id
  async function uploadDocument(pdfBlob, nomeArquivo) {
    const accId = _accountId();
    const form = new FormData();
    form.append('name', nomeArquivo);
    form.append('file', pdfBlob, nomeArquivo + '.pdf');
    const doc = await _request('POST', `/accounts/${accId}/documents`, form, true);
    return doc.id;
  }

  // Create or reuse a signer, returns signer id
  async function createSigner(fullName, email) {
    const accId = _accountId();
    const signer = await _request('POST', `/accounts/${accId}/signers`, { full_name: fullName, email });
    return signer.id;
  }

  // Request signatures — sends email to all signers at once
  // signerIds: array of signer IDs
  async function requestAssignment(documentId, signerIds) {
    await _request('POST', `/documents/${documentId}/assignments`, {
      method: 'virtual',
      signers: signerIds.map(id => ({ id })),
    });
  }

  // Check document status
  async function getDocumentStatus(documentId) {
    const doc = await _request('GET', `/documents/${documentId}`);
    return doc; // { id, status, ... }
  }

  // Full flow: generate PDF → upload → create signers → one assignment for all
  // signatarios: [{ nome, email }]
  async function enviarParaAssinatura(rdo, obra, criador, linhas, signatarios) {
    if (!_accountId()) throw new Error('ASSINAFY_ACCOUNT_ID não configurado.');
    if (!signatarios || signatarios.length === 0) throw new Error('Nenhum signatário configurado na obra.');

    // 1. Generate PDF as Blob
    const pdfBlob = PDFGen.generateBlob(rdo, obra, criador, linhas);
    const nomeArq = `RDO_${obra.codigo_of || 'DOC'}_${rdo.data_apontamento || ''}`;

    // 2. Upload document
    const documentId = await uploadDocument(pdfBlob, nomeArq);

    // 3. Create all signers in parallel
    const signerIds = await Promise.all(
      signatarios.map(sig => createSigner(sig.nome || sig.email, sig.email))
    );

    // 4. One assignment request with all signers — sends email to each
    await requestAssignment(documentId, signerIds);

    return documentId;
  }

  return { enviarParaAssinatura, getDocumentStatus, uploadDocument, createSigner, requestAssignment };
})();
