/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';
import JSZip from 'jszip';

type ImagePart = { mimeType: string; data: string; };
type ReferenceImage = ImagePart & { id: number; };
type LightMarker = {
    shape: 'circle' | 'arrow';
    x: number;
    y: number;
    path?: {x: number, y: number}[]; // For arrow drawing
    size?: number; // Kept for circle sizing if needed
};


// Use a CSS selector to tell the extension which element to use for the image editor
const appContainer = document.querySelector('.app-container');

if (appContainer) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Get DOM elements
  const imageUploadInput = appContainer.querySelector<HTMLInputElement>('#image-upload');
  const imagePreview = appContainer.querySelector<HTMLImageElement>('#image-preview');
  const promptInput = appContainer.querySelector<HTMLTextAreaElement>('#prompt-input');
  const promptInputWrapper = appContainer.querySelector<HTMLDivElement>('#prompt-input-wrapper');
  const negativePromptInput = appContainer.querySelector<HTMLTextAreaElement>('#negative-prompt-input');
  const creativitySlider = appContainer.querySelector<HTMLInputElement>('#creativity-slider');
  const creativityValue = appContainer.querySelector<HTMLSpanElement>('#creativity-value');
  const generateBtn = appContainer.querySelector<HTMLButtonElement>('#generate-btn');
  const imageGallery = appContainer.querySelector<HTMLDivElement>('#image-gallery');
  const imagePreviewContainer = appContainer.querySelector<HTMLDivElement>('#image-preview-container');
  const referenceUploadInput = appContainer.querySelector<HTMLInputElement>('#reference-upload');
  const referencePreviewContainer = appContainer.querySelector<HTMLDivElement>('#reference-preview-container');
  const referenceUploadArea = appContainer.querySelector<HTMLDivElement>('#reference-upload-area');
  const historyGallery = appContainer.querySelector<HTMLDivElement>('#history-gallery');
  const numButtons = appContainer.querySelectorAll<HTMLButtonElement>('.num-btn');
  const modeTabs = appContainer.querySelector<HTMLDivElement>('#mode-tabs');
  const presetButtonsContainer = appContainer.querySelector<HTMLDivElement>('#preset-buttons');
  const match3PresetButtonsContainer = appContainer.querySelector<HTMLDivElement>('#match3-preset-buttons');
  const resultContainer = appContainer.querySelector<HTMLDivElement>('#result-container');
  const mainImageUploadContainer = appContainer.querySelector<HTMLDivElement>('#image-upload-container'); 
  const promptInputContainer = appContainer.querySelector<HTMLDivElement>('#prompt-container'); 
  const fqaContentContainer = appContainer.querySelector<HTMLDivElement>('#fqa-content-container');
  const negativePromptContainer = appContainer.querySelector<HTMLDivElement>('#negative-prompt-container'); 
  const creativitySliderContainer = appContainer.querySelector<HTMLDivElement>('#creativity-slider-container');
  const generationCountSelector = appContainer.querySelector<HTMLDivElement>('#generation-count-selector'); 
  const clearImageBtn = appContainer.querySelector<HTMLButtonElement>('#clear-image-btn'); 

  // Concepting elements
  const conceptingUiContainer = appContainer.querySelector<HTMLDivElement>('#concepting-ui-container');
  const conceptThemeInput = appContainer.querySelector<HTMLInputElement>('#concept-theme-input');
  const conceptTransformInput = appContainer.querySelector<HTMLInputElement>('#concept-transform-input');
  const btnConceptKeepShape = appContainer.querySelector<HTMLButtonElement>('#preset-concept-keep-shape');
  const btnConceptNewShape = appContainer.querySelector<HTMLButtonElement>('#preset-concept-new-shape');
  const btnConceptKeepDesign = appContainer.querySelector<HTMLButtonElement>('#preset-concept-keep-design');
  const btnConceptConvert = appContainer.querySelector<HTMLButtonElement>('#preset-concept-convert-btn');
  const conceptCollectionTopicInput = appContainer.querySelector<HTMLInputElement>('#concept-collection-topic');
  const btnConceptCollection = appContainer.querySelector<HTMLButtonElement>('#preset-concept-collection-btn');


  // Aspect Ratio selector elements
  const aspectRatioSelector = appContainer.querySelector<HTMLDivElement>('#aspect-ratio-selector');
  const aspectRatioButtons = appContainer.querySelectorAll<HTMLButtonElement>('.aspect-ratio-btn');
  
  // Model selector elements (Free mode)
  const generationModelSelector = appContainer.querySelector<HTMLDivElement>('#generation-model-selector');
  const modelButtons = appContainer.querySelectorAll<HTMLButtonElement>('.model-btn');

  // Upscale elements
  const upscaleBtn = document.createElement('button');
  upscaleBtn.id = 'upscale-btn';
  upscaleBtn.className = 'action-btn upscale';
  upscaleBtn.ariaLabel = 'Upscale to 2K';
  upscaleBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="17 11 12 6 7 11"></polyline>
          <line x1="12" y1="18" x2="12" y2="6"></line>
      </svg>
  `;
  upscaleBtn.style.right = '5rem'; // Position to left of copy button
  const fullscreenModal = document.querySelector<HTMLDivElement>('#fullscreen-modal');
  if (fullscreenModal) fullscreenModal.appendChild(upscaleBtn);


  // Lighting elements
  const imageViewport = appContainer.querySelector<HTMLDivElement>('#image-viewport');
  const imageOverlayControls = appContainer.querySelector<HTMLDivElement>('#image-overlay-controls');
  const lightingControlsContainer = appContainer.querySelector<HTMLDivElement>('#lighting-controls-container');
  const temperatureSlider = appContainer.querySelector<HTMLInputElement>('#temperature-slider');
  const temperatureValue = appContainer.querySelector<HTMLSpanElement>('#temperature-value');
  const lightIntensitySlider = appContainer.querySelector<HTMLInputElement>('#light-intensity-slider');
  const lightIntensityValue = appContainer.querySelector<HTMLSpanElement>('#light-intensity-value');
  const lightColorPicker = appContainer.querySelector<HTMLInputElement>('#light-color-picker');
  const lightingPresetButtons = appContainer.querySelectorAll<HTMLButtonElement>('.lighting-preset-btn');
  const lightingOverlayCanvas = appContainer.querySelector<HTMLCanvasElement>('#lighting-overlay-canvas');
  const toggleComparisonBtn = appContainer.querySelector<HTMLButtonElement>('#toggle-comparison-btn');
  const toggleLightPlacementBtn = appContainer.querySelector<HTMLButtonElement>('#toggle-light-placement-btn');
  const lightProperties = appContainer.querySelector<HTMLDivElement>('#light-properties');
  const lightShapeSelector = appContainer.querySelector<HTMLDivElement>('#light-shape-selector');
  const clearLightSourcesBtn = appContainer.querySelector<HTMLButtonElement>('#clear-light-sources-btn');
  const resetLightColorBtn = appContainer.querySelector<HTMLButtonElement>('#reset-light-color-btn');
  const comparisonAfterContainer = appContainer.querySelector<HTMLDivElement>('#comparison-after-container');
  const comparisonAfterImage = appContainer.querySelector<HTMLImageElement>('#comparison-after-image');
  const comparisonSliderHandle = appContainer.querySelector<HTMLDivElement>('#comparison-slider-handle');
  const lightPlacementTool = appContainer.querySelector<HTMLDivElement>('#light-placement-tool');
  const overlayDivider = appContainer.querySelector<HTMLDivElement>('.divider');
  
  // New specific buttons for arrow/point lighting and reference lighting
  const btnLightArrow = appContainer.querySelector<HTMLButtonElement>('#btn-light-arrow');
  const btnLightPoint = appContainer.querySelector<HTMLButtonElement>('#btn-light-point');
  const btnLightingRef = appContainer.querySelector<HTMLButtonElement>('#btn-lighting-ref'); // NEW
  const directionToolsFieldset = appContainer.querySelector('#direction-tools-fieldset');


  // Inpainting elements
  const maskCanvas = appContainer.querySelector<HTMLCanvasElement>('#mask-canvas');
  const inpaintControls = appContainer.querySelector<HTMLDivElement>('#inpaint-controls');
  const brushSizeSlider = appContainer.querySelector<HTMLInputElement>('#brush-size-slider');
  const brushModeBtn = appContainer.querySelector<HTMLButtonElement>('#brush-mode-btn');
  const eraserModeBtn = appContainer.querySelector<HTMLButtonElement>('#eraser-mode-btn');
  const undoMaskBtn = appContainer.querySelector<HTMLButtonElement>('#undo-mask-btn');
  const clearMaskBtn = appContainer.querySelector<HTMLButtonElement>('#clear-mask-btn');
  const removeMaskBtn = appContainer.querySelector<HTMLButtonElement>('#remove-mask-btn');
  const brushCursor = document.querySelector<HTMLDivElement>('#brush-cursor');

  // Single Image Modal elements
  const fullscreenImage = document.querySelector<HTMLImageElement>('#fullscreen-image');
  const closeModalBtn = document.querySelector<HTMLButtonElement>('#close-modal-btn');
  const prevImageBtn = document.querySelector<HTMLButtonElement>('#prev-image-btn');
  const nextImageBtn = document.querySelector<HTMLButtonElement>('#next-image-btn');
  const copyModalBtn = document.querySelector<HTMLButtonElement>('#copy-modal-btn'); 
  
  // Gallery Modal elements
  const galleryModal = document.querySelector<HTMLDivElement>('#gallery-modal');
  const closeGalleryBtn = document.querySelector<HTMLButtonElement>('#close-gallery-btn');
  const galleryGrid = document.querySelector<HTMLDivElement>('#gallery-grid');
  const galleryBtn = appContainer.querySelector<HTMLButtonElement>('#gallery-btn');
  const filenamePrefixInput = document.querySelector<HTMLInputElement>('#filename-prefix');
  const downloadSelectedBtn = document.querySelector<HTMLButtonElement>('#download-selected-btn');


  let uploadedImage: ImagePart | null = null;
  let referenceImages: ReferenceImage[] = [];
  let history: ImagePart[] = [];
  let resultImages: ImagePart[] = [];
  let generationCount = 1;
  let currentMode = 'character';
  let selectedAspectRatio = '1:1'; // Default aspect ratio
  let selectedGenerationModel = 'imagen-4.0-generate-001'; // Default generation model
  let defaultPromptPlaceholder: string | null = null; // Store original placeholder
  let modePrompts: Record<string, string> = {}; // Store prompts for each mode

  // Inpainting state
  let maskCtx: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let isErasing = false;
  let maskHistory: ImageData[] = [];
  let lastX = 0;
  let lastY = 0;

  // Lighting state
  let lightingOverlayCtx: CanvasRenderingContext2D | null = null;
  let isPlacingLight = false;
  let isComparisonActive = false;
  let isDraggingSlider = false;
  let lightMarkers: LightMarker[] = [];
  let isDrawingArrow = false;


  // State for fullscreen navigation
  let currentGallery: ImagePart[] = [];
  let currentImageIndex = -1;
  // State for gallery selection
  let selectedHistoryIndices = new Set<number>();
  
  const MAX_HISTORY_SIZE = 20; // Limit history to prevent prompt UI clutter

  // --- HELPER FUNCTIONS ---

  const getCoords = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): {x: number, y: number} | null => {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const event = 'touches' in e ? e.touches[0] : e;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    if (canvas.width === 0 || canvas.height === 0) return true; 
    return !canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
  }

  const fileToImagePart = (file: File): Promise<ImagePart> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
            const data = dataUrl.substring(dataUrl.indexOf(',') + 1);
            resolve({ mimeType, data });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  }

  const copyImageToClipboard = async (imagePart: ImagePart) => {
    try {
        const img = new Image();
        img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(img, 0, 0);
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error("Failed to create blob");

        await navigator.clipboard.write([new ClipboardItem({'image/png': blob})]);
        return true;
    } catch (err) {
        console.error("Failed to copy image: ", err);
        alert("Failed to copy image to clipboard. " + err);
        return false;
    }
  };

  const updateBrushCursorSize = () => {
    if (brushCursor && brushSizeSlider) {
        const size = parseInt(brushSizeSlider.value, 10);
        brushCursor.style.width = `${size}px`;
        brushCursor.style.height = `${size}px`;
    }
  };

  const saveMaskState = () => {
    if (maskCtx && maskCanvas && maskCanvas.width > 0 && maskCanvas.height > 0) {
        maskHistory.push(maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    }
  };

  const undoLastMaskAction = () => {
    if (maskHistory.length > 1 && maskCtx) {
        maskHistory.pop(); 
        maskCtx.putImageData(maskHistory[maskHistory.length - 1], 0, 0);
    } else if (maskHistory.length === 1) {
        clearMask();
    }
  };

  const clearMask = () => {
    if (maskCtx && maskCanvas) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskHistory = [];
        saveMaskState(); 
    }
  }

  const drawLightMarkers = () => {
    if (!lightingOverlayCtx || !lightingOverlayCanvas) return;
    const ctx = lightingOverlayCtx;
    ctx.clearRect(0, 0, lightingOverlayCanvas.width, lightingOverlayCanvas.height);
    
    ctx.lineWidth = 3;

    lightMarkers.forEach(marker => {
        if (marker.shape === 'arrow' && marker.path && marker.path.length > 1) {
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.9)'; // Yellow for arrow
            ctx.beginPath();
            ctx.moveTo(marker.path[0].x, marker.path[0].y);
            for(let i=1; i<marker.path.length; i++){
                ctx.lineTo(marker.path[i].x, marker.path[i].y);
            }
            ctx.stroke();

            // Draw arrow head at the end
            const last = marker.path[marker.path.length - 1];
            // Simple arrow head based on last segment
            let angle = 0;
            if (marker.path.length > 5) {
                const prev = marker.path[Math.max(0, marker.path.length - 5)];
                angle = Math.atan2(last.y - prev.y, last.x - prev.x);
            } else {
                 const prev = marker.path[0];
                 angle = Math.atan2(last.y - prev.y, last.x - prev.x);
            }
            
            const headLen = 15;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(last.x - headLen * Math.cos(angle - Math.PI / 6), last.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(last.x - headLen * Math.cos(angle + Math.PI / 6), last.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.stroke();

        } else if (marker.shape === 'circle') {
             ctx.fillStyle = 'rgba(255, 255, 255, 1.0)'; // White dot
             ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
             ctx.beginPath();
             ctx.arc(marker.x, marker.y, 8, 0, Math.PI * 2);
             ctx.fill();
             ctx.stroke();
        }
    });
  }

  const clearLightMarkers = () => {
    lightMarkers = [];
    drawLightMarkers();
    if (clearLightSourcesBtn) clearLightSourcesBtn.classList.add('hidden');
  }

  const hideComparisonView = () => {
    if (comparisonAfterContainer && comparisonSliderHandle && toggleComparisonBtn) {
        isComparisonActive = false;
        comparisonAfterContainer.classList.add('hidden');
        comparisonSliderHandle.classList.add('hidden');
        toggleComparisonBtn.classList.remove('active');
        if (comparisonAfterImage) comparisonAfterImage.src = ''; 
        toggleComparisonBtn.disabled = true;
    }
  };

  const getDirectionFromPath = (path: {x: number, y: number}[], w: number, h: number): string => {
      if (!path || path.length < 2) return 'a specific direction';
      const start = path[0];
      const end = path[path.length - 1];
      
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      // Map angle to readable direction
      if (angle > -22.5 && angle <= 22.5) return 'from the left towards the right';
      else if (angle > 22.5 && angle <= 67.5) return 'from the top-left towards the bottom-right';
      else if (angle > 67.5 && angle <= 112.5) return 'from the top towards the bottom';
      else if (angle > 112.5 && angle <= 157.5) return 'from the top-right towards the bottom-left';
      else if (angle > 157.5 || angle <= -157.5) return 'from the right towards the left';
      else if (angle > -157.5 && angle <= -112.5) return 'from the bottom-right towards the top-left';
      else if (angle > -112.5 && angle <= -67.5) return 'from the bottom towards the top';
      else if (angle > -67.5 && angle <= -22.5) return 'from the bottom-left towards the top-right';

      return 'a specific direction';
  }

  const getPositionFromPoint = (x: number, y: number, w: number, h: number): string => {
      const col = x < w / 3 ? 'left' : (x > w * 2 / 3 ? 'right' : 'center');
      const row = y < h / 3 ? 'top' : (y > h * 2 / 3 ? 'bottom' : 'middle');
      
      if (col === 'center' && row === 'middle') return 'center';
      if (col === 'center') return `${row}-center`;
      if (row === 'middle') return `${col}-middle`;
      return `${row}-${col}`;
  }
  
  const getDimensionsFromRatio = (ratioStr: string): { width: number, height: number } => {
    switch (ratioStr) {
        case '16:9': return { width: 1536, height: 864 };
        case '9:16': return { width: 864, height: 1536 };
        case '4:3': return { width: 1280, height: 960 };
        case '3:4': return { width: 960, height: 1280 };
        case '1:1': default: return { width: 1024, height: 1024 };
    }
  };


  // --- UI LOGIC ---

  const setGalleryMessage = (message: string, isError = false, isRawText = false) => {
    if (imageGallery) {
      imageGallery.innerHTML = '';
      const messageEl = document.createElement(isRawText ? 'pre' : 'p'); 
      messageEl.textContent = message;
      messageEl.className = isError ? 'error' : 'placeholder';
      if (isRawText) messageEl.classList.add('raw-text-output');
      imageGallery.appendChild(messageEl);
    }
  };

  const updateButtonState = () => {
    const isImageLoaded = !!uploadedImage;
    const isPromptFilled = !!promptInput?.value.trim();

    if (generateBtn) {
      if (currentMode === 'lighting') {
        generateBtn.disabled = !isImageLoaded;
        generateBtn.textContent = 'Применить освещение';
      } else if (currentMode === 'free') {
        generateBtn.disabled = !isPromptFilled; 
        generateBtn.textContent = 'Generate';
      } else if (currentMode === 'analyze') {
        generateBtn.disabled = !isImageLoaded || !isPromptFilled; 
        generateBtn.textContent = 'Анализировать изображение';
      } else {
        generateBtn.disabled = !isImageLoaded || !isPromptFilled;
        generateBtn.textContent = 'Generate'; 
      }
    }
    
    const allPresetButtons = appContainer.querySelectorAll<HTMLButtonElement>('.preset-btn, .lighting-preset-btn');
    allPresetButtons.forEach(btn => {
        // Exclude Collection Button from this global disable logic, handle separately
        if (btn.id !== 'preset-concept-collection-btn') {
            btn.disabled = !isImageLoaded;
        }
    });

    // Special case for Concepting Convert button - enable if input has text and image is loaded
    if (currentMode === 'concepting') {
         if (btnConceptConvert && conceptTransformInput) {
            btnConceptConvert.disabled = !isImageLoaded || !conceptTransformInput.value.trim();
         }
         if (btnConceptCollection && conceptCollectionTopicInput) {
             // Collection needs multiple references (>=1 at least) OR main image and a topic
             const hasRefs = referenceImages.length > 0;
             const hasMainImage = !!uploadedImage;
             const hasTopic = !!conceptCollectionTopicInput.value.trim();
             btnConceptCollection.disabled = !(hasRefs || hasMainImage) || !hasTopic;
         }
    }
  };

  const updateMainUploadLabel = () => {
    const uploadLabel = appContainer?.querySelector<HTMLSpanElement>('#upload-label span');
    if (!uploadLabel) return;
    if (currentMode === 'free' && !uploadedImage) {
        uploadLabel.textContent = 'Click, drag & drop, or paste an image (optional for generation)';
    } else {
        uploadLabel.textContent = 'Click, drag & drop, or paste an image';
    }
  }

  const updateReferenceUploadLabel = () => {
    const labelSpan = appContainer.querySelector<HTMLSpanElement>('#reference-upload-label span') || 
                     appContainer.querySelector<HTMLSpanElement>('#reference-upload-area span');
    if (!labelSpan) return;

    if (currentMode === 'lighting') {
      labelSpan.textContent = 'Upload reference (optional, for lighting style)';
    } else if (currentMode === 'free') {
      labelSpan.textContent = 'Upload reference images (style/structure)';
    } else if (currentMode === 'concepting') {
       labelSpan.textContent = 'Upload multiple reference images (Multiple Choice)';
    } else {
      labelSpan.textContent = 'Upload reference images';
    }
  };

  const updatePromptPlaceholder = () => {
    if (!promptInput) return;
    
    switch (currentMode) {
      case 'lighting':
        promptInput.placeholder = 'Describe lighting adjustments (optional)...';
        break;
      case 'inpaint':
        promptInput.placeholder = 'Describe what to generate in the masked area...';
        break;
      case 'free':
        promptInput.placeholder = 'Describe the image you want to create...';
        break;
      case 'analyze':
        promptInput.placeholder = 'Ask a question about the image...';
        break;
      case 'concepting':
        promptInput.placeholder = 'Describe variations or transformations...';
        break;
      default:
        promptInput.placeholder = defaultPromptPlaceholder || 'Describe your request...';
    }
  };
  
  const analyzeAndSetTemperature = async (imagePart: ImagePart) => {
    if (!temperatureSlider || !temperatureValue) return;

    temperatureSlider.disabled = true;
    temperatureValue.textContent = '...';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: imagePart.data, mimeType: imagePart.mimeType } },
                    { text: 'Analyze the color temperature of this image. Respond with a single integer representing the Kelvin value, between 1000 and 10000. For example, a warm, candle-lit photo would be around 2000, and a cool, blue sky would be around 10000. Respond with ONLY the integer number and nothing else.' }
                ]
            },
            config: { temperature: 0 }
        });

        const tempStr = response.text.trim();
        let tempNum = parseInt(tempStr, 10);

        if (!isNaN(tempNum)) {
            tempNum = Math.max(1000, Math.min(10000, tempNum));
            temperatureSlider.value = String(tempNum);
            temperatureValue.textContent = String(tempNum);
        } else {
            temperatureSlider.value = '5000';
            temperatureValue.textContent = '5000';
        }
    } catch (error) {
        console.error('Error analyzing image temperature:', error);
        temperatureSlider.value = '5000';
        temperatureValue.textContent = '5000';
    } finally {
        temperatureSlider.disabled = false;
    }
  };

  const displayUploadedImage = (imagePart: ImagePart) => {
    if (imagePreview && imagePreviewContainer) {
      uploadedImage = imagePart;
      imagePreviewContainer.classList.add('has-image');
      
      imagePreview.onload = () => {
        imagePreviewContainer.style.aspectRatio = `${imagePreview.naturalWidth} / ${imagePreview.naturalHeight}`;
      };

      imagePreview.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
      imagePreview.classList.remove('hidden');
      if (clearImageBtn) clearImageBtn.classList.remove('hidden'); 
      clearMask();
      clearLightMarkers();
      hideComparisonView();
      updateButtonState();
      updateMainUploadLabel();

      if (currentMode === 'lighting') {
        analyzeAndSetTemperature(imagePart);
      }
    }
  };

  const renderReferenceImages = () => {
    if (!referencePreviewContainer) return;

    referencePreviewContainer.innerHTML = '';
    
    if (referenceImages.length === 0) {
        referencePreviewContainer.classList.add('hidden');
        return;
    }

    const label = document.createElement('span');
    label.id = 'reference-image-label';
    label.textContent = 'Reference Images:';
    referencePreviewContainer.appendChild(label);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'reference-grid';
    
    referenceImages.forEach(newRefImage => {
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'reference-thumbnail';
        
        const img = document.createElement('img');
        img.src = `data:${newRefImage.mimeType};base64,${newRefImage.data}`;
        img.alt = 'Reference image';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-ref-btn';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
            referenceImages = referenceImages.filter(ref => ref.id !== newRefImage.id);
            renderReferenceImages(); 
            updateButtonState(); 
        };

        thumbContainer.appendChild(img);
        thumbContainer.appendChild(removeBtn);
        gridContainer.appendChild(thumbContainer);
    });
    referencePreviewContainer.appendChild(gridContainer);
    referencePreviewContainer.classList.remove('hidden');
  };

  const resizeRefToMatchAspectRatio = (
    refImagePart: ImagePart,
    targetWidth: number,
    targetHeight: number
  ): Promise<ImagePart> => {
      return new Promise((resolve, reject) => {
          const refImg = new Image();
          refImg.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) return reject(new Error('Could not get canvas context'));

              // Using black bars for padding as requested
              ctx.fillStyle = '#000000'; 
              ctx.fillRect(0, 0, targetWidth, targetHeight);

              const scale = Math.min(targetWidth / refImg.naturalWidth, targetHeight / refImg.naturalHeight);
              const newWidth = refImg.naturalWidth * scale;
              const newHeight = refImg.naturalHeight * scale;
              const x = (targetWidth - newWidth) / 2;
              const y = (targetHeight - newHeight) / 2;

              ctx.drawImage(refImg, x, y, newWidth, newHeight);

              const dataUrl = canvas.toDataURL('image/png');
              const mimeType = 'image/png';
              const data = dataUrl.substring(dataUrl.indexOf(',') + 1);
              
              resolve({ mimeType, data });
          };
          refImg.onerror = reject;
          refImg.src = `data:${refImagePart.mimeType};base64,${refImagePart.data}`;
      });
  };

  const getSourceAspectRatio = async (sourceImage: ImagePart): Promise<string | undefined> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              const w = img.naturalWidth;
              const h = img.naturalHeight;
              const ratio = w / h;
              // Simple mapping to closest standard ratio for API stability, or undefined to let model decide
              if (Math.abs(ratio - 1) < 0.1) resolve('1:1');
              else if (Math.abs(ratio - 4/3) < 0.1) resolve('4:3');
              else if (Math.abs(ratio - 3/4) < 0.1) resolve('3:4');
              else if (Math.abs(ratio - 16/9) < 0.1) resolve('16:9');
              else if (Math.abs(ratio - 9/16) < 0.1) resolve('9:16');
              else resolve(undefined);
          };
          img.onerror = () => resolve(undefined);
          img.src = `data:${sourceImage.mimeType};base64,${sourceImage.data}`;
      });
  }

  // --- MAIN LOGIC ---

  const handleGenerateClick = async () => {
    if (!generateBtn || !imageGallery) return;
    
    // Check main image requirement. 
    // Free mode doesn't need main image.
    // Concepting Collection doesn't need main image (uses refs).
    const isConceptingCollection = currentMode === 'concepting' && (referenceImages.length > 0 || !!uploadedImage);
    
    if (currentMode !== 'free' && !isConceptingCollection && !uploadedImage) {
      setGalleryMessage('Please upload an image to edit.', true);
      return;
    }

    if (currentMode !== 'lighting' && !promptInput?.value.trim()){
      setGalleryMessage('Please enter a prompt.', true);
      return;
    }

    const prompt = promptInput?.value.trim() || '';
    const negativePrompt = negativePromptInput?.value.trim() || '';
    const temperature = creativitySlider ? parseFloat(creativitySlider.value) : 0.9;

    let finalPrompt = prompt;
    if (negativePrompt && currentMode !== 'lighting') {
        finalPrompt += `. Avoid the following: ${negativePrompt}`;
    }

    generateBtn.disabled = true;
    hideComparisonView();
    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setGalleryMessage(`Generating ${generationCount} image(s)...`);

    await new Promise(resolve => setTimeout(resolve, 20));

    try {
      resultImages = []; 
      let currentModelName: string;
      let generationAPI: 'generateContent' | 'generateImages';
      let apiRequestPayload: any;
      let isTextOutputMode = false; 

      // --- NEW LOGIC: Enforce Aspect Ratio for References in ALL modes ---
      let processedReferenceImages: ImagePart[] = referenceImages;

      // 1. Determine Target Dimensions
      let targetWidth = 1024;
      let targetHeight = 1024;

      if (uploadedImage) {
           // Get dimensions from uploaded image for consistency in Editing modes
           const img = new Image();
           await new Promise((resolve) => {
               img.onload = resolve;
               img.src = `data:${uploadedImage.mimeType};base64,${uploadedImage.data}`;
           });
           targetWidth = img.naturalWidth;
           targetHeight = img.naturalHeight;
      } else if (currentMode === 'free' || isConceptingCollection) {
           // Use selected aspect ratio for Free mode or Collection without main image
           const dims = getDimensionsFromRatio(selectedAspectRatio);
           targetWidth = dims.width;
           targetHeight = dims.height;
      }

      // 2. Resize References
      if (referenceImages.length > 0) {
          try {
              const resizePromises = referenceImages.map(refImg =>
                  resizeRefToMatchAspectRatio(refImg, targetWidth, targetHeight)
              );
              processedReferenceImages = await Promise.all(resizePromises);
          } catch (resizeError) {
              console.error("Error resizing references:", resizeError);
              processedReferenceImages = referenceImages; // Fallback
          }
      }
      // ------------------------------------------------------------------

      if (currentMode === 'lighting') {
          currentModelName = 'gemini-3-pro-image-preview';
          generationAPI = 'generateContent';
          
          let intensityPrompt = "";
          if (lightIntensitySlider) {
              const intensity = parseInt(lightIntensitySlider.value, 10);
              if (intensity !== 100) {
                  const diff = Math.abs(intensity - 100);
                  const direction = intensity > 100 ? "upward" : "downward";
                  intensityPrompt = ` Imagine the current image as a 3D scene. Imagine the current light intensity as 100 percent in this scene. Change the light intensity in the scene by ${diff} percent in the ${direction} direction. Do not change the saturation of the image itself; only simulate the lighting model in the image.`;
              }
          }

          if (processedReferenceImages.length > 0 && uploadedImage) {
              // Priority: Use User Input Prompt if available, otherwise default reference prompt
              if (promptInput?.value.trim()) {
                  finalPrompt = promptInput.value.trim();
              } else {
                  finalPrompt = "Apply the lighting style, mood, and color scheme from the second image (the reference) to the first image (the main subject). Maintain the character and pose from the first image. The first image is the primary subject, and the second is the lighting reference.";
              }
              
              finalPrompt += intensityPrompt;
              apiRequestPayload = {
                  model: currentModelName,
                  contents: {
                      parts: [
                          { inlineData: { data: uploadedImage!.data, mimeType: uploadedImage!.mimeType } },
                          { inlineData: { data: processedReferenceImages[0].data, mimeType: processedReferenceImages[0].mimeType } },
                          { text: finalPrompt }
                      ]
                  },
                  config: { 
                      responseModalities: [Modality.IMAGE], 
                      temperature: 0.4,
                  },
              };
          } else {
              if (promptInput?.value.trim()) {
                finalPrompt = promptInput.value.trim();
              } else {
                const tempValue = temperatureSlider?.value || '5000';
                const colorValue = lightColorPicker?.value || '#FFFFFF';
                finalPrompt = `Adjust the lighting of the image. Set the overall color temperature to approximately ${tempValue}K. If relevant, tint the primary light source with the color ${colorValue}.`;
              }
              finalPrompt += intensityPrompt;
              apiRequestPayload = {
                  model: currentModelName,
                  contents: {
                      parts: [
                          { inlineData: { data: uploadedImage!.data, mimeType: uploadedImage!.mimeType } },
                          { text: finalPrompt }
                      ]
                  },
                  config: { 
                      responseModalities: [Modality.IMAGE], 
                      temperature: 0.4,
                  },
              };
          }
      } else if (currentMode === 'analyze') {
          isTextOutputMode = true;
          currentModelName = 'gemini-3-pro-preview'; 
          generationAPI = 'generateContent';
          
          const allPartsForAnalyze: (object)[] = [];
          if (uploadedImage) {
              allPartsForAnalyze.push({ inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType } });
          }
          const referenceImagePartsForAnalyze = referenceImages.map(refImg => ({
              inlineData: { data: refImg.data, mimeType: refImg.mimeType }
          }));
          allPartsForAnalyze.push(...referenceImagePartsForAnalyze);
          allPartsForAnalyze.push({ text: finalPrompt }); 

          apiRequestPayload = {
              model: currentModelName,
              contents: { parts: allPartsForAnalyze },
              config: { responseModalities: [Modality.TEXT], temperature: temperature },
          };
      }
      else if (currentMode === 'free') {
          // Free mode logic
          if (referenceImages.length > 0) {
             // Use Gemini 3 Pro if references are present (Variation/Editing flow)
              currentModelName = 'gemini-3-pro-image-preview'; 
              generationAPI = 'generateContent';
              const allParts: (object)[] = [];
              const referenceImageParts = processedReferenceImages.map(refImg => ({
                  inlineData: { data: refImg.data, mimeType: refImg.mimeType }
              }));
              allParts.push(...referenceImageParts);
              allParts.push({ text: finalPrompt }); 
              
              apiRequestPayload = {
                  model: currentModelName,
                  contents: { parts: allParts },
                  config: { 
                      responseModalities: [Modality.IMAGE], 
                      temperature: temperature,
                      imageConfig: { aspectRatio: selectedAspectRatio }
                  },
              };

          } else {
              // Standard text-to-image with Model Selection
              if (selectedGenerationModel === 'gemini-3-pro-image-preview') {
                  // Text-to-Image via Gemini
                  currentModelName = 'gemini-3-pro-image-preview';
                  generationAPI = 'generateContent';
                   apiRequestPayload = {
                      model: currentModelName,
                      contents: { parts: [{ text: finalPrompt }] },
                      config: { 
                          responseModalities: [Modality.IMAGE], 
                          temperature: temperature,
                          imageConfig: { aspectRatio: selectedAspectRatio }
                      },
                  };
              } else {
                  // Text-to-Image via Imagen
                  currentModelName = selectedGenerationModel; // 'imagen-4.0-generate-001' or 'imagen-4.0-generate-ultra'
                  generationAPI = 'generateImages';
                  apiRequestPayload = {
                      model: currentModelName,
                      prompt: finalPrompt,
                      config: {
                          numberOfImages: generationCount,
                          outputMimeType: 'image/png',
                          aspectRatio: selectedAspectRatio,
                      },
                  };
              }
          }
      } else {
          // Character, Match3, Inpaint, Sketch, Concepting
          currentModelName = 'gemini-3-pro-image-preview'; 
          generationAPI = 'generateContent';
          const allParts: (object)[] = [];

          if (uploadedImage) {
              allParts.push({
                  inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType },
              });
          }
          
          if (currentMode === 'inpaint' && maskCanvas && imagePreview && !isCanvasBlank(maskCanvas) && uploadedImage) {
              const originalWidth = imagePreview.naturalWidth;
              const originalHeight = imagePreview.naturalHeight;
              const displayWidth = maskCanvas.width;
              const displayHeight = maskCanvas.height;
              const displayCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
              
              if (displayCtx) {
                  const drawnImageData = displayCtx.getImageData(0, 0, displayWidth, displayHeight);
                  const bwMaskImageData = new ImageData(displayWidth, displayHeight);
                  for (let i = 0; i < drawnImageData.data.length; i += 4) {
                      const alpha = drawnImageData.data[i + 3];
                      if (alpha > 0) {
                          bwMaskImageData.data[i] = 255; bwMaskImageData.data[i + 1] = 255; bwMaskImageData.data[i + 2] = 255; bwMaskImageData.data[i + 3] = 255;
                      } else {
                          bwMaskImageData.data[i] = 0; bwMaskImageData.data[i + 1] = 0; bwMaskImageData.data[i + 2] = 0; bwMaskImageData.data[i + 3] = 255;
                      }
                  }
                  
                  const tempCanvas = document.createElement('canvas');
                  tempCanvas.width = displayWidth;
                  tempCanvas.height = displayHeight;
                  tempCanvas.getContext('2d')?.putImageData(bwMaskImageData, 0, 0);
      
                  const finalMaskCanvas = document.createElement('canvas');
                  finalMaskCanvas.width = originalWidth;
                  finalMaskCanvas.height = originalHeight;
                  finalMaskCanvas.getContext('2d')?.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);
                  
                  const maskDataUrl = finalMaskCanvas.toDataURL('image/png');
                  const maskBase64 = maskDataUrl.substring(maskDataUrl.indexOf(',') + 1);
                  allParts.push({ inlineData: { mimeType: 'image/png', data: maskBase64 } });
              }
          }
          
          if (currentMode !== 'inpaint' && processedReferenceImages.length > 0) {
              const referenceImageParts = processedReferenceImages.map(refImg => ({
                  inlineData: { data: refImg.data, mimeType: refImg.mimeType }
              }));
              allParts.push(...referenceImageParts);
              
              if (uploadedImage) {
                finalPrompt = `This is an image editing task with references. You are given a primary image to edit, and one or more reference images. **Do not edit the reference images.** Your task is to apply the requested edit to the primary image only, using the reference images for guidance. The user's request is: "${finalPrompt}"`;
              }
          }

          allParts.push({ text: finalPrompt });
          
          apiRequestPayload = {
              model: currentModelName,
              contents: { parts: allParts },
              config: { 
                  responseModalities: [Modality.IMAGE], 
                  temperature: temperature,
              },
          };
      }

      const activeGenCount = (currentMode === 'analyze') ? 1 : generationCount;
      const MAX_TOTAL_ATTEMPTS = activeGenCount * 3;
      let attempts = 0;
      
      while(resultImages.length < activeGenCount && attempts < MAX_TOTAL_ATTEMPTS) {
          if (isTextOutputMode) generationCount = 1;
          const needed = activeGenCount - resultImages.length;
          if (attempts > 0) await new Promise(resolve => setTimeout(resolve, 500));
          console.log(`Attempting to generate ${needed} more image(s)...`);

          if (generationAPI === 'generateContent') {
              const generationPromises = Array(needed).fill(null).map(() => ai.models.generateContent(apiRequestPayload));
              attempts += needed;
              const results = await Promise.allSettled(generationPromises);
              for (const result of results) {
                  if (result.status === 'fulfilled') {
                      const response = result.value;
                      if (isTextOutputMode) {
                          imageGallery.innerHTML = '';
                          setGalleryMessage(response.text, false, true); 
                          break; 
                      } else {
                          const imagePartFound = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
                          if (imagePartFound?.inlineData) {
                              if (resultImages.length < activeGenCount) {
                                  resultImages.push({
                                      mimeType: imagePartFound.inlineData.mimeType,
                                      data: imagePartFound.inlineData.data,
                                  });
                              }
                          }
                      }
                  }
              }
              if (isTextOutputMode) break; 
          } else if (generationAPI === 'generateImages') {
              const imgRequestPayload = { ...apiRequestPayload, config: { ...apiRequestPayload.config, numberOfImages: needed } };
              attempts += needed; 
              try {
                  const response = await ai.models.generateImages(imgRequestPayload);
                  if (response.generatedImages) {
                      for (const genImage of response.generatedImages) {
                          if (genImage.image?.imageBytes && resultImages.length < activeGenCount) {
                              resultImages.push({
                                  mimeType: 'image/png',
                                  data: genImage.image.imageBytes,
                              });
                          }
                      }
                  }
              } catch (error) { console.error('generateImages failed:', error); }
          }
      }

      if (resultImages.length > 0) {
        imageGallery.innerHTML = ''; 
        
        const supportsComparison = ['character', 'sketch', 'inpaint', 'match3', 'lighting', 'concepting'].includes(currentMode);
        if (supportsComparison && uploadedImage && comparisonAfterImage) {
            const newImagePart = resultImages[0];
            comparisonAfterImage.src = `data:${newImagePart.mimeType};base64,${newImagePart.data}`;
            if (toggleComparisonBtn) toggleComparisonBtn.disabled = false;
        }
        
        resultImages.forEach((imagePart, index) => {
            const galleryButton = document.createElement('button');
            galleryButton.className = 'gallery-item';
            galleryButton.onclick = () => {
                if (supportsComparison && uploadedImage && comparisonAfterImage && toggleComparisonBtn) {
                    const clickedImage = resultImages[index];
                    comparisonAfterImage.src = `data:${clickedImage.mimeType};base64,${clickedImage.data}`;
                    toggleComparisonBtn.disabled = false; 
                }
                openModal(resultImages, index);
            };
            const img = document.createElement('img');
            img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
            galleryButton.appendChild(img);
            imageGallery.appendChild(galleryButton);
        });
        
        if (!isTextOutputMode) {
            history.push(...resultImages);
            if (history.length > MAX_HISTORY_SIZE) history.splice(0, history.length - MAX_HISTORY_SIZE);
            renderHistory();
        }
      } else if (!isTextOutputMode) { 
        setGalleryMessage('The model did not return any images. Please try again.', true);
      }
    } catch (error) {
      console.error('Error:', error);
      setGalleryMessage('An error occurred. Check console.', true);
    } finally {
      if (promptInput && currentMode === 'lighting') {
          promptInput.value = ''; 
          clearLightMarkers();
          if (toggleLightPlacementBtn && lightProperties) {
              isPlacingLight = false;
              toggleLightPlacementBtn.classList.remove('active');
              lightProperties.classList.add('hidden');
              imagePreviewContainer?.classList.remove('light-placement-active');
              if (directionToolsFieldset) directionToolsFieldset.classList.add('hidden');
          }
      }
      updateButtonState();
    }
  };

  const handleUpscale = async () => {
      if (currentGallery.length === 0 || currentImageIndex < 0) return;
      
      const sourceImage = currentGallery[currentImageIndex];
      const upscaleBtnIcon = upscaleBtn.innerHTML;
      upscaleBtn.innerHTML = '...';
      upscaleBtn.disabled = true;

      try {
          const aspectRatio = await getSourceAspectRatio(sourceImage);
          const response = await ai.models.generateContent({
              model: 'gemini-3-pro-image-preview',
              contents: {
                  parts: [
                      { inlineData: { data: sourceImage.data, mimeType: sourceImage.mimeType } },
                      { text: "Upscale this image to 2K resolution. Maintain the exact composition, details, and style. Only increase the fidelity and texture quality." }
                  ]
              },
              config: {
                  responseModalities: [Modality.IMAGE],
                  imageConfig: { 
                      imageSize: '2K',
                      aspectRatio: aspectRatio 
                  }
              }
          });
          
          const imagePartFound = response.candidates?.[0]?.content.parts.find(part => part.inlineData);
          if (imagePartFound?.inlineData) {
              const newImagePart = {
                  mimeType: imagePartFound.inlineData.mimeType,
                  data: imagePartFound.inlineData.data
              };
              
              // Add to history and display
              history.push(newImagePart);
              renderHistory();
              
              // Switch modal to new image
              openModal([newImagePart], 0);
          } else {
              alert('Upscale failed to return an image.');
          }

      } catch (e) {
          console.error('Upscale error:', e);
          alert('Upscale failed. See console.');
      } finally {
          upscaleBtn.innerHTML = upscaleBtnIcon;
          upscaleBtn.disabled = false;
      }
  };

  if (upscaleBtn) {
      upscaleBtn.addEventListener('click', handleUpscale);
  }
  
  // --- EVENT HANDLERS ---

  const processMainImageFile = async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
        uploadedImage = null;
        if (imagePreview) {
            imagePreview.classList.add('hidden');
            imagePreview.src = '';
        }
        if (imagePreviewContainer) imagePreviewContainer.classList.remove('has-image');
        if (clearImageBtn) clearImageBtn.classList.add('hidden'); 
        clearMask();
        clearLightMarkers();
        hideComparisonView();
        updateButtonState();
        updateMainUploadLabel();
        return;
    }
    const imagePart = await fileToImagePart(file);
    displayUploadedImage(imagePart);
  };

  const processReferenceFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    for (const file of newImageFiles) {
        const imagePart = await fileToImagePart(file);
        referenceImages.push({ ...imagePart, id: Date.now() + Math.random() });
    }
    renderReferenceImages(); 
    updateButtonState();
  };

  const setupCanvases = () => {
    if (!maskCanvas || !imagePreview || !brushSizeSlider || !brushCursor || !lightingOverlayCanvas || !lightShapeSelector || !imageViewport) return;
    maskCtx = maskCanvas.getContext('2d');
    lightingOverlayCtx = lightingOverlayCanvas.getContext('2d');
    if (!maskCtx || !lightingOverlayCtx) return;

    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            maskCanvas.width = width;
            maskCanvas.height = height;
            lightingOverlayCanvas.width = width;
            lightingOverlayCanvas.height = height;
            if (comparisonAfterImage) {
                comparisonAfterImage.style.width = `${width}px`;
                comparisonAfterImage.style.height = `${height}px`;
            }
            if(maskCtx) {
                maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                maskCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                maskCtx.lineWidth = parseInt(brushSizeSlider.value, 10);
                maskCtx.lineCap = 'round';
            }
            clearMask(); 
            clearLightMarkers(); 
        }
    });
    resizeObserver.observe(imagePreview);

    updateBrushCursorSize();
    maskCanvas.addEventListener('mousemove', (e) => {
        brushCursor.style.left = `${e.clientX}px`;
        brushCursor.style.top = `${e.clientY}px`;
        if (isDrawing) {
            e.preventDefault();
            const coords = getCoords(e, maskCanvas);
            if (coords) {
                maskCtx!.beginPath();
                maskCtx!.moveTo(lastX, lastY);
                maskCtx!.lineTo(coords.x, coords.y);
                maskCtx!.stroke();
                [lastX, lastY] = [coords.x, coords.y];
            }
        }
    });

    maskCanvas.addEventListener('mouseenter', () => brushCursor.classList.remove('hidden'));
    maskCanvas.addEventListener('mouseleave', () => brushCursor.classList.add('hidden'));

    maskCanvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const coords = getCoords(e, maskCanvas);
        if (!coords) return;
        saveMaskState();
        isDrawing = true;
        [lastX, lastY] = [coords.x, coords.y];
        maskCtx!.beginPath();
        maskCtx!.arc(coords.x, coords.y, maskCtx!.lineWidth / 2, 0, Math.PI * 2);
        maskCtx!.fill();
    });

    maskCanvas.addEventListener('mouseup', () => { isDrawing = false; maskCtx?.beginPath(); });
    maskCanvas.addEventListener('mouseout', () => { isDrawing = false; maskCtx?.beginPath(); });

    // Lighting Overlay Events
    lightingOverlayCanvas.addEventListener('mousedown', (e) => {
        if (!isPlacingLight) return;
        const coords = getCoords(e, lightingOverlayCanvas);
        if (!coords) return;

        const shape = lightShapeSelector.querySelector<HTMLInputElement>('input[name="light-shape"]:checked')?.value as 'circle' | 'arrow';
        
        if (shape === 'arrow') {
            isDrawingArrow = true;
            const newArrow: LightMarker = { shape: 'arrow', x: coords.x, y: coords.y, path: [coords] };
            lightMarkers.push(newArrow);
            drawLightMarkers();
        } else {
             // Circle: Single point logic. Replace all markers.
            lightMarkers = [{ shape: 'circle', x: coords.x, y: coords.y }];
            drawLightMarkers();
            if (clearLightSourcesBtn) clearLightSourcesBtn.classList.remove('hidden');
        }
    });

    lightingOverlayCanvas.addEventListener('mousemove', (e) => {
        if (isDrawingArrow) {
             const coords = getCoords(e, lightingOverlayCanvas);
             if (coords) {
                 const currentArrow = lightMarkers[lightMarkers.length - 1];
                 if (currentArrow && currentArrow.shape === 'arrow' && currentArrow.path) {
                     currentArrow.path.push(coords);
                     drawLightMarkers();
                 }
             }
        }
    });

    const stopDrawingLight = () => {
        if (isDrawingArrow) {
            isDrawingArrow = false;
            if (clearLightSourcesBtn) clearLightSourcesBtn.classList.remove('hidden');
        }
    }

    lightingOverlayCanvas.addEventListener('mouseup', stopDrawingLight);
    lightingOverlayCanvas.addEventListener('mouseleave', stopDrawingLight);
  };

  // --- MODAL & GALLERY LOGIC ---

  const updateModalContent = () => {
    if (!fullscreenImage || !prevImageBtn || !nextImageBtn) return;
    const imagePart = currentGallery[currentImageIndex];
    fullscreenImage.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
    prevImageBtn.disabled = currentImageIndex === 0;
    nextImageBtn.disabled = currentImageIndex === currentGallery.length - 1;
  };

  const openModal = (sourceGallery: ImagePart[], index: number) => {
    if (fullscreenModal && fullscreenImage && sourceGallery.length > 0) {
        currentGallery = sourceGallery;
        currentImageIndex = index;
        updateModalContent();
        fullscreenModal.classList.remove('modal-hidden');
    }
  };

  const closeModal = () => {
    if (fullscreenModal) fullscreenModal.classList.add('modal-hidden');
  };

  const showPrevImage = () => {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateModalContent();
    }
  };

  const showNextImage = () => {
    if (currentImageIndex < currentGallery.length - 1) {
        currentImageIndex++;
        updateModalContent();
    }
  };

  const handleDownloadSelected = async () => {
    if (!downloadSelectedBtn || selectedHistoryIndices.size === 0) return;
    const prefix = filenamePrefixInput?.value.trim() || 'image';
    downloadSelectedBtn.disabled = true;

    if (selectedHistoryIndices.size === 1) {
        downloadSelectedBtn.textContent = 'Загрузка...';
        const index = selectedHistoryIndices.values().next().value;
        const imagePart = history[index];
        const link = document.createElement('a');
        link.href = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        link.download = `${prefix}.png`;
        link.click();
    } else {
        downloadSelectedBtn.textContent = 'Архивация...';
        const zip = new JSZip();
        let count = 1;
        selectedHistoryIndices.forEach(index => {
            zip.file(`${prefix}_${count++}.png`, history[index].data, { base64: true });
        });
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${prefix}.zip`;
        link.click();
    }
    downloadSelectedBtn.textContent = 'Загрузить выбранное';
    downloadSelectedBtn.disabled = false;
  };

  const openGalleryModal = () => {
    if (!galleryModal || !galleryGrid) return;
    galleryGrid.innerHTML = ''; 
    selectedHistoryIndices.clear(); 
    
    history.forEach((imagePart, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-grid-item';
        galleryItem.onclick = () => {
            if (selectedHistoryIndices.has(index)) {
                selectedHistoryIndices.delete(index);
                galleryItem.classList.remove('selected');
            } else {
                selectedHistoryIndices.add(index);
                galleryItem.classList.add('selected');
            }
            downloadSelectedBtn!.disabled = selectedHistoryIndices.size === 0;
        };

        const img = document.createElement('img');
        img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        galleryItem.appendChild(img);
        galleryGrid.appendChild(galleryItem);
    });
    galleryModal.classList.remove('modal-hidden');
  };

  const renderHistory = () => {
    if (!historyGallery) return;
    historyGallery.innerHTML = '';
    const startIndex = Math.max(0, history.length - 10);
    for (let i = history.length - 1; i >= startIndex; i--) {
        const imagePart = history[i];
        const historyItem = document.createElement('button');
        historyItem.className = 'history-item';
        historyItem.onclick = () => openModal(history, i);
        historyItem.draggable = true;
        historyItem.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('application/json', JSON.stringify(imagePart));
        });
        const img = document.createElement('img');
        img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        historyItem.appendChild(img);
        historyGallery.appendChild(historyItem);
    }
  }


  // --- INITIALIZATION ---
  if (imageUploadInput && promptInput && generateBtn && imagePreviewContainer && modeTabs && presetButtonsContainer) {
    
    if (promptInput) defaultPromptPlaceholder = promptInput.placeholder; 

    imageUploadInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files && files.length > 0) processMainImageFile(files[0]);
    });
    
    referenceUploadInput.addEventListener('change', (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) processReferenceFiles(files);
        (e.target as HTMLInputElement).value = '';
    });
    
    if (conceptTransformInput) {
        conceptTransformInput.addEventListener('input', updateButtonState);
    }
    
    if (conceptCollectionTopicInput) {
        conceptCollectionTopicInput.addEventListener('input', updateButtonState);
    }

    promptInput.addEventListener('input', updateButtonState);
    generateBtn.addEventListener('click', handleGenerateClick);
    
    temperatureSlider.addEventListener('input', () => {
        temperatureValue.textContent = temperatureSlider.value;
    });

    if (lightIntensitySlider && lightIntensityValue) {
        lightIntensitySlider.addEventListener('input', () => {
            lightIntensityValue.textContent = lightIntensitySlider.value;
        });
    }

    toggleLightPlacementBtn.addEventListener('click', () => {
        isPlacingLight = !isPlacingLight;
        toggleLightPlacementBtn.classList.toggle('active', isPlacingLight);
        lightProperties.classList.toggle('hidden', !isPlacingLight);
        imagePreviewContainer.classList.toggle('light-placement-active', isPlacingLight);
        
        // New Logic for toggling direction tools fieldset
        if (directionToolsFieldset) {
            directionToolsFieldset.classList.toggle('hidden', !isPlacingLight);
        }

        if (!isPlacingLight) isDrawingArrow = false;
        else clearLightSourcesBtn.classList.toggle('hidden', lightMarkers.length === 0);
    });
    
    if (resetLightColorBtn && lightColorPicker) {
        resetLightColorBtn.addEventListener('click', () => lightColorPicker.value = '#FFFFFF');
    }
    
    clearLightSourcesBtn.addEventListener('click', clearLightMarkers);
    
    lightingPresetButtons.forEach(button => {
        button.addEventListener('click', () => {
            // New Reference Button Check
            if (button.id === 'btn-lighting-ref') return; // Handled separately
            if (button.id === 'btn-light-arrow') return;
            if (button.id === 'btn-light-point') return;

            if (!uploadedImage || !promptInput) return;
            const prompt = button.dataset.prompt;
            const colorValue = lightColorPicker?.value || '#FFFFFF';
            if (prompt) {
                let finalPrompt = prompt;
                if (colorValue.toUpperCase() !== '#FFFFFF') finalPrompt = `${prompt}, colored ${colorValue}`;
                promptInput.value = finalPrompt;
                handleGenerateClick(); 
            }
        });
    });

    // Special logic for new light buttons
    if (btnLightArrow && btnLightPoint) {
        btnLightArrow.addEventListener('click', () => {
            if (!uploadedImage || !promptInput || !lightingOverlayCanvas) return;
            const arrow = lightMarkers.find(m => m.shape === 'arrow');
            if (arrow && arrow.path) {
                const direction = getDirectionFromPath(arrow.path, lightingOverlayCanvas.width, lightingOverlayCanvas.height);
                const colorValue = lightColorPicker?.value || '#FFFFFF';
                let desc = `Change the light so it looks like the light source is located as the arrow indicates. (Lighting direction: ${direction}).`;
                if (colorValue.toUpperCase() !== '#FFFFFF') desc += ` Use ${colorValue} colored light.`;
                promptInput.value = desc;
                handleGenerateClick();
            } else {
                setGalleryMessage('Please draw an arrow first using the pencil tool in the lighting overlay.', true);
            }
        });

        btnLightPoint.addEventListener('click', () => {
            if (!uploadedImage || !promptInput || !lightingOverlayCanvas) return;
            const point = lightMarkers.find(m => m.shape === 'circle');
            if (point) {
                 const position = getPositionFromPoint(point.x, point.y, lightingOverlayCanvas.width, lightingOverlayCanvas.height);
                 const colorValue = lightColorPicker?.value || '#FFFFFF';
                 let desc = `Change the light so it looks like the light source is located where the white dot is. (Light source from the ${position}).`;
                 if (colorValue.toUpperCase() !== '#FFFFFF') desc += ` Use ${colorValue} colored light.`;
                 promptInput.value = desc;
                 handleGenerateClick();
            } else {
                setGalleryMessage('Please place a point first using the dot tool in the lighting overlay.', true);
            }
        });
    }

    // New Logic: Lighting via Reference
    if (btnLightingRef) {
        btnLightingRef.addEventListener('click', () => {
            if (!uploadedImage || !promptInput) return;
            if (referenceImages.length === 0) {
                setGalleryMessage('Please upload a reference image first.', true);
                return;
            }
            promptInput.value = "Use the lighting scheme and only that from the reference image - image 2, and apply it to image 1 (the main image).";
            handleGenerateClick();
        });
    }

    toggleComparisonBtn.addEventListener('click', () => {
        if (toggleComparisonBtn.disabled) return;
        isComparisonActive = !isComparisonActive;
        toggleComparisonBtn.classList.toggle('active', isComparisonActive);
        comparisonAfterContainer.classList.toggle('hidden', !isComparisonActive);
        comparisonSliderHandle.classList.toggle('hidden', !isComparisonActive);
    });

    const moveSlider = (clientX: number) => {
        const rect = imageViewport.getBoundingClientRect();
        let x = clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x)); 
        const percent = (x / rect.width) * 100;
        comparisonSliderHandle.style.left = `${percent}%`;
        comparisonAfterContainer.style.width = `${percent}%`;
    };

    comparisonSliderHandle.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text selection
        e.stopPropagation(); 
        isDraggingSlider = true;
        imageViewport.classList.add('grabbing');
    });

    comparisonSliderHandle.addEventListener('click', (e) => e.stopPropagation());
    window.addEventListener('mouseup', () => {
        isDraggingSlider = false;
        imageViewport.classList.remove('grabbing');
    });
    window.addEventListener('mousemove', (e) => {
        if (isDraggingSlider) moveSlider(e.clientX);
    });

    if (creativitySlider && creativityValue) {
        creativitySlider.addEventListener('input', () => creativityValue.textContent = creativitySlider.value);
    }

    numButtons.forEach(button => {
        button.addEventListener('click', () => {
            generationCount = parseInt(button.dataset.count || '1', 10);
            numButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    aspectRatioButtons.forEach(button => {
      button.addEventListener('click', () => {
        selectedAspectRatio = button.dataset.ratio || '1:1';
        aspectRatioButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });
    
    // Model Buttons Event Listener
    if (modelButtons) {
        modelButtons.forEach(button => {
            button.addEventListener('click', () => {
                selectedGenerationModel = button.dataset.model || 'imagen-4.0-generate-001';
                modelButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                button.classList.add('active');
                button.setAttribute('aria-pressed', 'true');
            });
        });
    }


    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            processMainImageFile(null); 
            imageUploadInput.value = ''; 
        });
    }

    imagePreviewContainer.addEventListener('click', (e) => {
        if (currentMode !== 'inpaint' && !isPlacingLight && e.target !== maskCanvas && e.target !== lightingOverlayCanvas && e.target !== clearImageBtn) {
            imageUploadInput.click();
        }
    });

    imagePreviewContainer.addEventListener('dragover', (e) => { e.preventDefault(); imagePreviewContainer.classList.add('drag-over'); });
    imagePreviewContainer.addEventListener('dragleave', (e) => { e.preventDefault(); imagePreviewContainer.classList.remove('drag-over'); });
    imagePreviewContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        imagePreviewContainer.classList.remove('drag-over');
        
        const historyItemJson = e.dataTransfer?.getData('application/json');
        if (historyItemJson) {
            try {
                const imagePart: ImagePart = JSON.parse(historyItemJson);
                const file = new File([Uint8Array.from(atob(imagePart.data), c => c.charCodeAt(0))], 'dropped_history.png', { type: imagePart.mimeType });
                processMainImageFile(file);
            } catch (err) { console.error("Drop error", err); }
            return;
        }

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) processMainImageFile(files[0]);
    });
    
    referenceUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); referenceUploadArea.classList.add('drag-over'); });
    referenceUploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); referenceUploadArea.classList.remove('drag-over'); });
    referenceUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        referenceUploadArea.classList.remove('drag-over');
        const files = e.dataTransfer?.files;
        if (files) processReferenceFiles(files);
    });

    window.addEventListener('paste', (event) => {
        const items = event.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    processMainImageFile(file);
                    event.preventDefault(); 
                    break;
                }
            }
        }
    });

    modeTabs.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.matches('.tab-btn')) {
        if (promptInput) modePrompts[currentMode] = promptInput.value;

        const mode = target.dataset.mode || 'character';
        currentMode = mode;
        
        modeTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        target.classList.add('active');
        target.setAttribute('aria-selected', 'true');

        const isFQA = mode === 'fqa';
        const isLighting = mode === 'lighting';
        const isFree = mode === 'free';

        // --- Logic for Generation Count Visibility ---
        const countBtn5 = appContainer.querySelector('.num-btn[data-count="5"]');
        const countBtn6 = appContainer.querySelector('.num-btn[data-count="6"]');
        if (isFree) {
            countBtn5?.classList.add('hidden');
            countBtn6?.classList.add('hidden');
            if (generationCount > 4) {
                generationCount = 4;
                numButtons.forEach(btn => btn.classList.remove('active'));
                appContainer.querySelector('.num-btn[data-count="4"]')?.classList.add('active');
            }
            if (generationModelSelector) generationModelSelector.classList.remove('hidden'); // Show Model Selector
        } else {
            countBtn5?.classList.remove('hidden');
            countBtn6?.classList.remove('hidden');
            if (generationModelSelector) generationModelSelector.classList.add('hidden'); // Hide Model Selector
        }


        if (isFQA) {
          mainImageUploadContainer.classList.add('hidden');
          promptInputContainer.classList.add('hidden');
          resultContainer.classList.add('hidden');
          fqaContentContainer.classList.remove('hidden');
          uploadedImage = null; referenceImages = []; processMainImageFile(null); renderReferenceImages();
        } else { 
            mainImageUploadContainer.classList.remove('hidden');
            promptInputContainer.classList.remove('hidden');
            resultContainer.classList.remove('hidden');
            fqaContentContainer.classList.add('hidden');
            
            const showPresets = mode === 'character';
            const showMatch3Presets = mode === 'match3';
            const showConceptingUI = mode === 'concepting';
            const showInpaintControls = mode === 'inpaint';
            const showAspectRatio = mode === 'free';
            const showLightingControls = isLighting;
            const supportsComparison = ['character', 'sketch', 'inpaint', 'match3', 'lighting', 'concepting'].includes(mode);

            presetButtonsContainer.classList.toggle('hidden', !showPresets);
            match3PresetButtonsContainer?.classList.toggle('hidden', !showMatch3Presets);
            if (conceptingUiContainer) conceptingUiContainer.classList.toggle('hidden', !showConceptingUI);
            
            inpaintControls?.classList.toggle('hidden', !showInpaintControls);
            aspectRatioSelector?.classList.toggle('hidden', !showAspectRatio);
            
            referenceUploadArea.classList.toggle('hidden', mode === 'analyze');
            negativePromptContainer?.classList.toggle('hidden', mode === 'analyze' || isLighting);
            creativitySliderContainer?.classList.toggle('hidden', mode === 'analyze' || isLighting);
            generationCountSelector?.classList.toggle('hidden', mode === 'analyze');
            lightingControlsContainer?.classList.toggle('hidden', !showLightingControls);
            imageOverlayControls.classList.toggle('hidden', !supportsComparison);
            
            if (lightPlacementTool) lightPlacementTool.classList.toggle('hidden', !isLighting);
            if (overlayDivider) overlayDivider.classList.toggle('hidden', !isLighting);
            
            imagePreviewContainer.classList.toggle('hidden', mode === 'free');
            imagePreviewContainer.classList.toggle('inpaint-active', mode === 'inpaint');
            
            // Reset overlay states
            imagePreviewContainer.classList.remove('light-placement-active');
            isPlacingLight = false;
            if (toggleLightPlacementBtn && lightProperties) {
                toggleLightPlacementBtn.classList.remove('active');
                lightProperties.classList.add('hidden');
            }
            // Ensure direction tools fieldset is hidden when switching modes
            if (directionToolsFieldset) {
                directionToolsFieldset.classList.add('hidden');
            }

            hideComparisonView();
            if (brushCursor) brushCursor.classList.add('hidden');

            if (isLighting && uploadedImage) analyzeAndSetTemperature(uploadedImage);
        }
        
        if (promptInput) promptInput.value = modePrompts[currentMode] || '';
        updateReferenceUploadLabel();
        updateMainUploadLabel();
        updatePromptPlaceholder();
        updateButtonState();
      }
    });

    if (brushSizeSlider && brushModeBtn && eraserModeBtn && undoMaskBtn && clearMaskBtn && removeMaskBtn) {
        brushSizeSlider.addEventListener('input', () => {
            if (maskCtx) maskCtx.lineWidth = parseInt(brushSizeSlider.value, 10);
            updateBrushCursorSize();
        });

        brushModeBtn.addEventListener('click', () => {
            if (!maskCtx) return;
            isErasing = false;
            maskCtx.globalCompositeOperation = 'source-over';
            brushModeBtn.classList.add('active');
            eraserModeBtn.classList.remove('active');
        });

        eraserModeBtn.addEventListener('click', () => {
            if (!maskCtx) return;
            isErasing = true;
            maskCtx.globalCompositeOperation = 'destination-out';
            eraserModeBtn.classList.add('active');
            brushModeBtn.classList.remove('active');
        });

        undoMaskBtn.addEventListener('click', undoLastMaskAction);
        clearMaskBtn.addEventListener('click', clearMask);
        removeMaskBtn.addEventListener('click', () => {
            if (!promptInput) return;
            promptInput.value = 'remove the masked object';
            updateButtonState();
            handleGenerateClick();
        });
    }

    const setupPresetButton = (id: string, text: string) => {
      const button = appContainer.querySelector<HTMLButtonElement>(`#${id}`);
      if (button) {
        button.addEventListener('click', () => {
          if (!uploadedImage || !promptInput) return;
          promptInput.value = text;
          updateButtonState();
          handleGenerateClick();
        });
      }
    };

    // Concepting preset button logic
    const setupConceptingButton = (btn: HTMLButtonElement | null, baseText: string) => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (!uploadedImage || !promptInput) return;
                const theme = conceptThemeInput ? conceptThemeInput.value.trim() : '';
                let finalPrompt = baseText;
                if (theme) {
                    finalPrompt += ` In the theme of ${theme}.`;
                }
                promptInput.value = finalPrompt;
                updateButtonState();
                handleGenerateClick();
            });
        }
    };
    
    setupConceptingButton(btnConceptKeepShape, "Please create a version of this object with a different design, but in the same art style. Keep the original shape of the object.");
    setupConceptingButton(btnConceptNewShape, "Please create a version of this object with a different design, but in the same art style. Change the original shape of the object.");
    setupConceptingButton(btnConceptKeepDesign, "Please create a version of this object with a different design, but in the same art style. Change the original shape of the object, but keep the visual coloring.");

    if (btnConceptConvert) {
        btnConceptConvert.addEventListener('click', () => {
            if (!uploadedImage || !promptInput || !conceptTransformInput) return;
            const objName = conceptTransformInput.value.trim();
            if (objName) {
                promptInput.value = `convert the object into a ${objName}`;
                updateButtonState();
                handleGenerateClick();
            } else {
                setGalleryMessage('Please enter an object name to transform into.', true);
            }
        });
    }

    // Collection button logic
    if (btnConceptCollection) {
        btnConceptCollection.addEventListener('click', () => {
            if (!conceptCollectionTopicInput || !promptInput) return;
            const topic = conceptCollectionTopicInput.value.trim();
            if (topic) {
                let contextStr = "";
                if (uploadedImage && referenceImages.length > 0) {
                    contextStr = "Analyze the main image and attached reference images";
                } else if (uploadedImage) {
                    contextStr = "Analyze the main image";
                } else {
                    contextStr = "Analyze the attached reference images";
                }
                promptInput.value = `Create a collection of images on the ${topic}. ${contextStr} to understand the style, composition, and visual logic of the collection, and generate a new result that fits this collection.`;
                updateButtonState();
                handleGenerateClick();
            }
        });
    }

    
    setupPresetButton('preset-turn-side', 'Измени вид сбоку');
    setupPresetButton('preset-turn-34', 'Измени вид в 3/4');
    setupPresetButton('preset-turn-back', 'Измени вид со спины');
    setupPresetButton('preset-turn-front', 'Измени вид анфас');
    setupPresetButton('preset-emotion-ref', 'Изменить эмоцию персонажа');
    setupPresetButton('preset-emotion-sad', 'Измени эмоцию персонажа - грусть');
    setupPresetButton('preset-emotion-surprise', 'Измени эмоцию персонажа - удивление');
    setupPresetButton('preset-emotion-joy', 'Измени эмоцию персонажа - радость');
    setupPresetButton('preset-pose-sit', 'Измени позу персонажа - сидит');
    setupPresetButton('preset-pose-dance', 'Измени позу персонажа - танцует');
    setupPresetButton('preset-pose-gesture', 'Измени позу персонажа - жестикулирует руками');
    setupPresetButton('preset-shine-10', 'Добавь пластикового блеска на 10%. Представь шкалу пластика как 100% и добавь 10% блеска');
    setupPresetButton('preset-shine-15', 'Добавь пластикового блеска на 15%. Представь шкалу пластика как 100% и добавь 15% блеска');
    setupPresetButton('preset-shine-20', 'Добавь пластикового блеска на 20%. Представь шкалу пластика как 100% и добавь 20% блеска');
    setupPresetButton('preset-shine-25', 'Добавь пластикового блеска на 25%. Представь шкалу пластика как 100% и добавь 25% блеска');
    setupPresetButton('preset-shine-30', 'Добавь пластикового блеска на 30%. Представь шкалу пластика как 100% и добавь 30% блеска');
    setupPresetButton('preset-metal-30', 'Добавь эффекта метала на 30%. Представь шкалу метала как 100% и добавь 30% эффекта');
    setupPresetButton('preset-metal-40', 'Добавь эффекта метала на 40%. Представь шкалу метала как 100% и добавь 40% эффекта');
    setupPresetButton('preset-metal-50', 'Добавь эффекта метала на 50%. Представь шкалу метала как 100% и добавь 50% эффекта');
    setupPresetButton('preset-metal-70', 'Добавь эффекта метала на 70%. Представь шкалу метала как 100% и добавь 70% эффекта');
    setupPresetButton('preset-shadows', 'усиль немного тени с фронтальным освещением');
    setupPresetButton('preset-pose-ref', 'Измени позу персонажа согласно прикрепленному референсу');
    setupPresetButton('preset-turn-360', 'покажи как персонаж в этой позе будет выглядеть во всех следующих положениях: сбоку поворот влево, в 3/4, сзади, сбоку поворот вправо. Добавь произвольно еще 2 ракурса. сгенерируй это отдельными изображениями');
    setupPresetButton('preset-head-turns', 'покажи поворот головы во всех слудующих положениях: сбоку поворот влево, в 3/4, сзади, сбоку поворот вправо. Добавь произвольно еще 2 ракурса, 3/4 смотрит вверх, 3/4 смотрит вниз, смотрит вверх, смотрит вниз. сгенерируй это отдельными изображениями');
    
    if (fullscreenModal && closeModalBtn && prevImageBtn && nextImageBtn) {
        closeModalBtn.addEventListener('click', closeModal);
        prevImageBtn.addEventListener('click', showPrevImage);
        nextImageBtn.addEventListener('click', showNextImage);
        fullscreenModal.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) closeModal();
        });
        if (copyModalBtn) {
            copyModalBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (currentGallery.length > 0 && currentImageIndex >= 0) {
                    const success = await copyImageToClipboard(currentGallery[currentImageIndex]);
                    if (success) {
                         copyModalBtn.classList.add('success');
                         setTimeout(() => copyModalBtn.classList.remove('success'), 500);
                    }
                }
            });
        }
    }

    if (galleryModal && closeGalleryBtn && galleryBtn && downloadSelectedBtn) {
      galleryBtn.addEventListener('click', openGalleryModal);
      closeGalleryBtn.addEventListener('click', () => galleryModal.classList.add('modal-hidden'));
      downloadSelectedBtn.addEventListener('click', handleDownloadSelected);
      galleryModal.addEventListener('click', (e) => {
          if (e.target === galleryModal) galleryModal.classList.add('modal-hidden');
      });
    }

    window.addEventListener('keydown', async (e) => {
        if (fullscreenModal && !fullscreenModal.classList.contains('modal-hidden')) {
             if (e.key === 'Escape') closeModal();
             if (e.key === 'ArrowLeft') showPrevImage();
             if (e.key === 'ArrowRight') showNextImage();
             if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                 e.preventDefault(); 
                 if (currentGallery.length > 0 && currentImageIndex >= 0) {
                    const success = await copyImageToClipboard(currentGallery[currentImageIndex]);
                    if (success && copyModalBtn) {
                        copyModalBtn.classList.add('success');
                        setTimeout(() => copyModalBtn.classList.remove('success'), 500);
                    }
                 }
             }
             return; 
        }
        if (galleryModal && !galleryModal.classList.contains('modal-hidden')) {
            if (e.key === 'Escape') galleryModal.classList.add('modal-hidden');
        }
    });

    setupCanvases();
    setGalleryMessage('Your generated image will appear here.');
    renderHistory();
    const defaultTabButton = appContainer.querySelector<HTMLButtonElement>('#tab-character');
    if (defaultTabButton) defaultTabButton.click();
  }
}