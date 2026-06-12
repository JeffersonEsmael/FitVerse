/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Keeps quality excellent while reducing file size.
 * 
 * @param {File|Blob} file The image file to compress
 * @param {Object} options Configuration parameters
 * @param {number} options.maxWidth Maximum width of the output image (default: 1080)
 * @param {number} options.maxHeight Maximum height of the output image (default: 1080)
 * @param {number} options.quality JPEG quality from 0.0 to 1.0 (default: 0.7)
 * @returns {Promise<Blob|File>} A promise resolving to the compressed Blob/File
 */
export const compressImage = (file, { maxWidth = 1080, maxHeight = 1080, quality = 0.7 } = {}) => {
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

/**
 * Client-side video compression using Canvas and Web Audio API transcoding to MediaRecorder.
 * Trims size aggressively by reducing resolution to max dimension of 640px,
 * limiting framerate to 24fps, and setting a low target video bitrate (e.g. 700kbps).
 * 
 * @param {File|Blob} file Original video file
 * @param {Object} options Configuration parameters
 * @param {number} options.maxDimension Maximum width or height (default: 640)
 * @param {number} options.fps Frames per second (default: 24)
 * @param {number} options.bitrate Target video bits per second (default: 700000)
 * @param {function} options.onProgress Progress callback receiving percentages from 0 to 100
 * @returns {Promise<Blob|File>} A promise resolving to the compressed video
 */
export const compressVideo = (file, { maxDimension = 640, fps = 24, bitrate = 700000, onProgress } = {}) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('video/')) {
      return resolve(file);
    }

    const videoEl = document.createElement('video');
    videoEl.src = URL.createObjectURL(file);
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';

    videoEl.onloadedmetadata = () => {
      let width = videoEl.videoWidth || 640;
      let height = videoEl.videoHeight || 360;

      // Downscale to target max dimension
      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      // Ensure dimensions are even (required by some encoders)
      width = width % 2 === 0 ? width : width - 1;
      height = height % 2 === 0 ? height : height - 1;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(videoEl.src);
        return resolve(file); // Fallback
      }

      // Capture stream from canvas
      const canvasStream = canvas.captureStream(fps);

      // Extract original audio stream to mix with canvas video
      let audioCtx, source, dest, mixedStream;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaElementSource(videoEl);
        dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        
        // Combine canvas video track + Web Audio destination stream audio track
        const audioTrack = dest.stream.getAudioTracks()[0];
        if (audioTrack) {
          mixedStream = new MediaStream([
            canvasStream.getVideoTracks()[0],
            audioTrack
          ]);
        } else {
          mixedStream = canvasStream;
        }
      } catch (err) {
        console.warn('[compression] Web Audio capture failed, silent recording fallback:', err);
        mixedStream = canvasStream;
      }

      // Choose supported mimeType
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }

      const recorderOptions = mimeType ? { mimeType, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate };
      let mediaRecorder;
      const chunks = [];

      try {
        mediaRecorder = new MediaRecorder(mixedStream, recorderOptions);
      } catch (recErr) {
        console.error('[compression] MediaRecorder init failed:', recErr);
        URL.revokeObjectURL(videoEl.src);
        return resolve(file); // Fallback to original
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      let animId = null;

      mediaRecorder.onstop = () => {
        if (videoEl.cancelVideoFrameCallback && animId) {
          videoEl.cancelVideoFrameCallback(animId);
        } else if (animId) {
          cancelAnimationFrame(animId);
        }
        
        // Cleanup Web Audio context
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }

        // Revoke Object URL to avoid leaks
        URL.revokeObjectURL(videoEl.src);

        const recordedBlob = new Blob(chunks, { type: mimeType || 'video/webm' });
        const name = (file.name || `video-${Date.now()}.webm`).replace(/\.[^/.]+$/, "") + ".webm";
        try {
          const compressedFile = new File([recordedBlob], name, {
            type: mimeType || 'video/webm',
            lastModified: Date.now()
          });
          if (typeof onProgress === 'function') {
            onProgress(100);
          }
          resolve(compressedFile);
        } catch (e) {
          if (typeof onProgress === 'function') {
            onProgress(100);
          }
          resolve(recordedBlob);
        }
      };

      // Play video and draw frame-by-frame
      videoEl.play().catch((err) => {
        console.error('[compression] Video playback failed:', err);
        URL.revokeObjectURL(videoEl.src);
        resolve(file);
      });

      mediaRecorder.start();

      const render = () => {
        if (!videoEl.paused && !videoEl.ended) {
          ctx.drawImage(videoEl, 0, 0, width, height);
          
          if (typeof onProgress === 'function' && videoEl.duration) {
            const pct = Math.min(Math.round((videoEl.currentTime / videoEl.duration) * 100), 99);
            onProgress(pct);
          }

          if (videoEl.requestVideoFrameCallback) {
            animId = videoEl.requestVideoFrameCallback(render);
          } else {
            animId = requestAnimationFrame(render);
          }
        }
      };

      if (videoEl.requestVideoFrameCallback) {
        animId = videoEl.requestVideoFrameCallback(render);
      } else {
        animId = requestAnimationFrame(render);
      }

      videoEl.onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      // Fallback timeout in case onended doesn't fire
      const duration = (videoEl.duration || 30) * 1000;
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, duration + 3000);
    };

    videoEl.onerror = (err) => {
      console.error('[compression] Video element load failed:', err);
      URL.revokeObjectURL(videoEl.src);
      resolve(file);
    };
  });
};
