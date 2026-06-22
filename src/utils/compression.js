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
 * Produces HD-quality output suitable for mobile screens (720p).
 * 
 * Resolution: max dimension 1280px (720p portrait/landscape)
 * Framerate: 30fps for smooth playback
 * Bitrate: 2.5 Mbps for crisp HD quality
 * Codec priority: H.264 (best compatibility) > VP9 > VP8
 * 
 * @param {File|Blob} file Original video file
 * @param {Object} options Configuration parameters
 * @param {number} options.maxDimension Maximum width or height (default: 1280 for 720p)
 * @param {number} options.fps Frames per second (default: 30)
 * @param {number} options.bitrate Target video bits per second (default: 2500000 = 2.5Mbps)
 * @param {function} options.onProgress Progress callback receiving percentages from 0 to 100
 * @returns {Promise<Blob|File>} A promise resolving to the compressed video
 */
export const compressVideo = (file, { maxDimension = 1280, fps = 30, bitrate = 2500000, onProgress } = {}) => {
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
      let width = videoEl.videoWidth || 1280;
      let height = videoEl.videoHeight || 720;

      // Downscale to target max dimension while maintaining HD quality
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

      // Enforce minimum quality floor: never compress below 480p
      const minDimension = Math.min(width, height);
      if (minDimension < 480) {
        // If the source is already small, don't compress further
        const scaleFactor = 480 / minDimension;
        width = Math.round(width * scaleFactor);
        height = Math.round(height * scaleFactor);
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;
      }

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

      // Choose supported mimeType — prefer H.264 for best compatibility & quality,
      // then fallback to VP9/VP8
      let mimeType = '';
      const codecPriority = [
        'video/mp4;codecs=avc1',        // H.264 (best quality + compatibility)
        'video/webm;codecs=h264',        // H.264 in WebM container
        'video/webm;codecs=vp9',         // VP9 (good quality, larger files)
        'video/webm;codecs=vp8',         // VP8 fallback
        'video/webm',                    // Generic WebM
      ];

      for (const codec of codecPriority) {
        if (MediaRecorder.isTypeSupported(codec)) {
          mimeType = codec;
          break;
        }
      }

      console.log(`[compression] Using codec: ${mimeType || 'browser default'}, ${width}x${height} @ ${(bitrate/1000000).toFixed(1)}Mbps ${fps}fps`);

      const recorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: bitrate, audioBitsPerSecond: 128000 }
        : { videoBitsPerSecond: bitrate, audioBitsPerSecond: 128000 };
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

        // Determine file extension based on codec
        const isMP4 = mimeType.includes('mp4') || mimeType.includes('avc');
        const extension = isMP4 ? 'mp4' : 'webm';
        const finalMimeType = isMP4 ? 'video/mp4' : (mimeType || 'video/webm');

        const recordedBlob = new Blob(chunks, { type: finalMimeType });
        const name = (file.name || `video-${Date.now()}.${extension}`).replace(/\.[^/.]+$/, "") + `.${extension}`;
        try {
          const compressedFile = new File([recordedBlob], name, {
            type: finalMimeType,
            lastModified: Date.now()
          });
          if (typeof onProgress === 'function') {
            onProgress(100);
          }
          console.log(`[compression] ✅ Done: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (${width}x${height})`);
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

/**
 * Generates a thumbnail image from the first second of a video file.
 * Uses canvas to capture a frame and export it as a high-quality JPEG.
 * 
 * @param {File|Blob} file The video file to generate a thumbnail from
 * @param {Object} options Configuration parameters
 * @param {number} options.seekTime Time in seconds to capture the frame (default: 1)
 * @param {number} options.maxWidth Maximum thumbnail width (default: 720)
 * @param {number} options.maxHeight Maximum thumbnail height (default: 1280)
 * @param {number} options.quality JPEG quality 0.0-1.0 (default: 0.85)
 * @returns {Promise<File|null>} A promise resolving to the thumbnail File, or null on failure
 */
export const generateVideoThumbnail = (file, { seekTime = 1, maxWidth = 720, maxHeight = 1280, quality = 0.85 } = {}) => {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('video/')) {
      return resolve(null);
    }

    const videoEl = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    videoEl.src = objectUrl;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.preload = 'auto';

    // Timeout safety net
    const timeout = setTimeout(() => {
      console.warn('[compression] Thumbnail generation timed out');
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    }, 15000);

    videoEl.onloadedmetadata = () => {
      // Seek to the requested time (or 0 if video is too short)
      const seekTo = Math.min(seekTime, videoEl.duration * 0.5);
      videoEl.currentTime = seekTo;
    };

    videoEl.onseeked = () => {
      clearTimeout(timeout);

      let width = videoEl.videoWidth;
      let height = videoEl.videoHeight;

      // Scale down keeping aspect ratio
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
        URL.revokeObjectURL(objectUrl);
        return resolve(null);
      }

      ctx.drawImage(videoEl, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return resolve(null);

          try {
            const thumbnailFile = new File(
              [blob],
              `thumb_${Date.now()}.jpg`,
              { type: 'image/jpeg', lastModified: Date.now() }
            );
            console.log(`[compression] 🖼️ Thumbnail generated: ${width}x${height}, ${(blob.size / 1024).toFixed(0)}KB`);
            resolve(thumbnailFile);
          } catch (e) {
            resolve(blob);
          }
        },
        'image/jpeg',
        quality
      );
    };

    videoEl.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      console.warn('[compression] Failed to load video for thumbnail');
      resolve(null);
    };
  });
};
