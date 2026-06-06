/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Keeps quality excellent while reducing file size.
 * 
 * @param {File|Blob} file The image file to compress
 * @param {Object} options Configuration parameters
 * @param {number} options.maxWidth Maximum width of the output image (default: 1080)
 * @param {number} options.maxHeight Maximum height of the output image (default: 1080)
 * @param {number} options.quality JPEG quality from 0.0 to 1.0 (default: 0.8)
 * @returns {Promise<Blob|File>} A promise resolving to the compressed Blob/File
 */
export const compressImage = (file, { maxWidth = 1080, maxHeight = 1080, quality = 0.8 } = {}) => {
  return new Promise((resolve, reject) => {
    // If the file is not an image, return it unmodified
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }
    // GIF files should not be compressed with canvas as they lose animation
    if (file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions keeping aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file); // fallback
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to Blob (prefer JPEG for best compression/quality balance)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Preserve file name if we can construct a File, otherwise return Blob
            const originalName = file.name || 'image.jpg';
            const name = originalName.replace(/\.[^/.]+$/, "") + ".jpg";
            try {
              const compressedFile = new File([blob], name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } catch (e) {
              // Browser might not support File constructor fully, return Blob
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};
