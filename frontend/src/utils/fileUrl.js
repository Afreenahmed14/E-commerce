/**
 * Turns a Cloudinary delivery URL into one that forces a file download
 * (Content-Disposition: attachment) instead of trying to open inline,
 * and optionally gives the downloaded file a friendly name.
 *
 * Cloudinary raw/image delivery URLs look like:
 *   https://res.cloudinary.com/<cloud>/raw/upload/v169.../resumes/uuid-name.pdf
 * Inserting an `fl_attachment` transformation flag right after `/upload/`
 * tells Cloudinary to serve it with a download disposition:
 *   https://res.cloudinary.com/<cloud>/raw/upload/fl_attachment:name/v169.../resumes/uuid-name.pdf
 *
 * Safe no-op for falsy input or URLs that don't match the expected shape.
 */
export const asDownloadUrl = (url, filename) => {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const flag = filename
    ? `fl_attachment:${encodeURIComponent(filename.replace(/\.[^/.]+$/, ''))}`
    : 'fl_attachment';

  return `${url.slice(0, idx + marker.length)}${flag}/${url.slice(idx + marker.length)}`;
};
