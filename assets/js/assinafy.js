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
    try {
      const signer = await _request('POST', `/accounts/${accId}/signers`, { full_name: fullName, email });
      return signer.id;
    } catch (e) {
      // Signer with this email already exists — find and reuse
      const list = await _request('GET', `/accounts/${accId}/signers`);
      const existing = (list || []).find(s => s.email === email);
      if (existing) return existing.id;
      throw e;
    }
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

  // Download the signed (certificated) PDF as a Blob
  async function downloadSignedDocument(documentId) {
    const doc = await _request('GET', `/documents/${documentId}`);
    // Assinafy retorna as URLs dos artefatos em doc.artifacts
    const artifacts = doc.artifacts || {};
    const artifactUrl = artifacts.certificated || artifacts.bundle || artifacts.original;
    if (!artifactUrl) throw new Error('URL de download não encontrada no documento.');
    // Extrai o path e roteia pelo proxy local (que injeta o API key)
    const apiPath = new URL(artifactUrl).pathname.replace('/v1', '');
    const res = await fetch(`${PROXY}${apiPath}`);
    if (!res.ok) throw new Error(`Erro ao baixar arquivo certificado: ${res.status}`);
    return res.blob();
  }

  // Full flow: generate PDF → upload → create signers → one assignment for all
  // signatarios: [{ nome, email }]
  async function enviarParaAssinatura(rdo, obra, criador, linhas, signatarios) {
    if (!_accountId()) throw new Error('ASSINAFY_ACCOUNT_ID não configurado.');
    if (!signatarios || signatarios.length === 0) throw new Error('Nenhum signatário configurado na obra.');

    // 1. Generate PDF as Blob
    const pdfBlob = PDFGen.generateBlob(rdo, obra, criador, linhas);
    const nomeArq = `RDO_${obra.codigo_of || 'DOC'}_${rdo.data_apontamento || ''}`;
    console.log('[Assinafy] 1. PDF gerado:', nomeArq, pdfBlob.size, 'bytes');

    // 2. Upload document
    let documentId;
    try {
      documentId = await uploadDocument(pdfBlob, nomeArq);
      console.log('[Assinafy] 2. Upload OK — documentId:', documentId);
    } catch (e) { throw new Error('Erro no upload do PDF: ' + e.message); }

    // 3. Create all signers in parallel
    let signerIds;
    try {
      signerIds = await Promise.all(
        signatarios.map(sig => createSigner(sig.nome || sig.email, sig.email))
      );
      console.log('[Assinafy] 3. Signatários OK:', signerIds);
    } catch (e) { throw new Error('Erro ao criar signatário: ' + e.message); }

    // 4. One assignment request with all signers — sends email to each
    try {
      await requestAssignment(documentId, signerIds);
      console.log('[Assinafy] 4. Assignment OK');
    } catch (e) { throw new Error('Erro ao solicitar assinatura: ' + e.message); }

    return documentId;
  }

  return { enviarParaAssinatura, getDocumentStatus, downloadSignedDocument, uploadDocument, createSigner, requestAssignment };
})();
