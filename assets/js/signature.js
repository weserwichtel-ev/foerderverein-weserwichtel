/**
 * Förderverein der Kita Weserwichtel e.V.
 * Digital Signature Pad Handler
 * Utilizes SignaturePad library (https://github.com/szimek/signature_pad)
 */

(function (window) {
  'use strict';

  let signaturePadInstance = null;
  let canvasRef = null;

  /**
   * Resizes canvas to match its CSS display size and accounts for High-DPI screens.
   * Restores existing signature points so drawing is not lost during window resize.
   */
  function resizeCanvas() {
    if (!canvasRef || !signaturePadInstance) return;

    // Save existing strokes if any
    const existingData = signaturePadInstance.toData();

    // Calculate ratio based on device pixel ratio
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvasRef.getBoundingClientRect();

    // Set canvas internal resolution to physical device pixels
    canvasRef.width = rect.width * ratio;
    canvasRef.height = rect.height * ratio;

    const ctx = canvasRef.getContext('2d');
    ctx.scale(ratio, ratio);

    // Clear and restore stroke data
    signaturePadInstance.clear();
    if (existingData && existingData.length > 0) {
      signaturePadInstance.fromData(existingData);
    }
  }

  /**
   * Initialize the Signature Pad on the given canvas element.
   * @param {HTMLCanvasElement|string} canvas - Canvas element or its selector
   * @param {HTMLElement|string} [clearBtn] - Optional button to clear signature
   * @returns {SignaturePad} The initialized SignaturePad instance
   */
  function initSignature(canvas, clearBtn) {
    const canvasElement = typeof canvas === 'string' ? document.querySelector(canvas) : canvas;
    if (!canvasElement) {
      console.warn('[Signature] Canvas element not found.');
      return null;
    }

    if (typeof window.SignaturePad === 'undefined') {
      console.error('[Signature] SignaturePad library is not loaded.');
      return null;
    }

    canvasRef = canvasElement;

    signaturePadInstance = new window.SignaturePad(canvasRef, {
      backgroundColor: 'rgba(255, 255, 255, 0)',
      penColor: '#0f172a', // Slate-900 for dark, ink-like strokes
      minWidth: 1.0,
      maxWidth: 2.5,
      throttle: 16
    });

    // Initial resize calculation
    resizeCanvas();

    // Listen for window resize with debounce
    let resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 150);
    });

    // Wire up clear button if provided
    if (clearBtn) {
      const clearBtnElement = typeof clearBtn === 'string' ? document.querySelector(clearBtn) : clearBtn;
      if (clearBtnElement) {
        clearBtnElement.addEventListener('click', function (e) {
          e.preventDefault();
          clearSignature();
        });
      }
    }

    return signaturePadInstance;
  }

  /**
   * Clears the signature canvas.
   */
  function clearSignature() {
    if (signaturePadInstance) {
      signaturePadInstance.clear();
      const wrapper = canvasRef ? canvasRef.closest('.signature-wrapper') : null;
      if (wrapper) {
        wrapper.classList.remove('is-invalid');
      }
    }
  }

  /**
   * Checks if user has drawn a signature.
   * @returns {boolean} True if empty, false if signed.
   */
  function isSignatureEmpty() {
    if (!signaturePadInstance) return true;
    return signaturePadInstance.isEmpty();
  }

  /**
   * Returns base64 PNG data URL of the signature.
   * @returns {string|null}
   */
  function getSignatureDataURL() {
    if (!signaturePadInstance || signaturePadInstance.isEmpty()) {
      return null;
    }
    return signaturePadInstance.toDataURL('image/png');
  }

  /**
   * Expose signature controller to global window scope.
   */
  window.SignatureController = {
    init: initSignature,
    clear: clearSignature,
    isEmpty: isSignatureEmpty,
    getDataURL: getSignatureDataURL,
    getInstance: function () {
      return signaturePadInstance;
    },
    resize: resizeCanvas
  };

})(window);
