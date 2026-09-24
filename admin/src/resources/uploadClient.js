import { createSHA256 } from 'hash-wasm';

const CHUNK = 8 * 1024 * 1024;

// SHA-256 of a file, read in pieces so a large master is never held in
// memory whole.
export const sha256File = async (file, onProgress) => {
  const hasher = await createSHA256();
  hasher.init();
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    const piece = await file.slice(offset, offset + CHUNK).arrayBuffer();
    hasher.update(new Uint8Array(piece));
    onProgress?.(Math.min(1, (offset + CHUNK) / file.size));
  }
  return hasher.digest('hex');
};

/*
 * Hash the file, ask the service where it goes, and send it unless an
 * identical file is already stored. Resolves to { key, backend, exists }.
 */
export const uploadFile = async (file, { kind, onHashProgress, onUploadProgress } = {}) => {
  const sha256 = await sha256File(file, onHashProgress);
  const token = localStorage.getItem('token');

  const res = await fetch('/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      kind,
      sha256,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const plan = await res.json();

  if (plan.exists) {
    onUploadProgress?.(1);
    return plan;
  }

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(plan.method, plan.url);
    Object.entries(plan.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    if (plan.backend === 'local') xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onUploadProgress?.(e.loaded / e.total);
    };
    xhr.onload = () =>
      (xhr.status >= 200 && xhr.status < 300)
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error('upload failed'));
    xhr.send(file);
  });

  return plan;
};