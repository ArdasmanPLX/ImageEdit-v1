
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';
import JSZip from 'jszip';

type ImagePart = { mimeType: string; data: string; };
type ReferenceImage = ImagePart & { id: number; };
type LightMarker = { x: number; y: number; size: number; shape: 'circle' | 'cone'; rotation: number; };


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
  const mainImageUploadContainer = appContainer.querySelector<HTMLDivElement>('#image-upload-container'); // Re-introduced
  const promptInputContainer = appContainer.querySelector<HTMLDivElement>('#prompt-container'); // Get reference to prompt container
  const fqaContentContainer = appContainer.querySelector<HTMLDivElement>('#fqa-content-container'); // New FQA container
  const negativePromptContainer = appContainer.querySelector<HTMLDivElement>('#negative-prompt-container'); // Container for negative prompt
  const creativitySliderContainer = appContainer.querySelector<HTMLDivElement>('#creativity-slider-container'); // Container for creativity slider
  const generationCountSelector = appContainer.querySelector<HTMLDivElement>('#generation-count-selector'); // Container for generation count
  const clearImageBtn = appContainer.querySelector<HTMLButtonElement>('#clear-image-btn'); // NEW: Clear image button

  // Aspect Ratio selector elements
  const aspectRatioSelector = appContainer.querySelector<HTMLDivElement>('#aspect-ratio-selector');
  const aspectRatioButtons = appContainer.querySelectorAll<HTMLButtonElement>('.aspect-ratio-btn');

  // Lighting elements
  const imageViewport = appContainer.querySelector<HTMLDivElement>('#image-viewport');
  const imageOverlayControls = appContainer.querySelector<HTMLDivElement>('#image-overlay-controls');
  const lightingControlsContainer = appContainer.querySelector<HTMLDivElement>('#lighting-controls-container');
  const temperatureSlider = appContainer.querySelector<HTMLInputElement>('#temperature-slider');
  const temperatureValue = appContainer.querySelector<HTMLSpanElement>('#temperature-value');
  const lightColorPicker = appContainer.querySelector<HTMLInputElement>('#light-color-picker');
  const lightingPresetButtons = appContainer.querySelectorAll<HTMLButtonElement>('.lighting-preset-btn');
  const lightingOverlayCanvas = appContainer.querySelector<HTMLCanvasElement>('#lighting-overlay-canvas');
  const toggleComparisonBtn = appContainer.querySelector<HTMLButtonElement>('#toggle-comparison-btn');
  const toggleLightPlacementBtn = appContainer.querySelector<HTMLButtonElement>('#toggle-light-placement-btn');
  const lightProperties = appContainer.querySelector<HTMLDivElement>('#light-properties');
  const lightSizeSlider = appContainer.querySelector<HTMLInputElement>('#light-size-slider');
  const lightShapeSelector = appContainer.querySelector<HTMLDivElement>('#light-shape-selector');
  const clearLightSourcesBtn = appContainer.querySelector<HTMLButtonElement>('#clear-light-sources-btn');
  const comparisonAfterContainer = appContainer.querySelector<HTMLDivElement>('#comparison-after-container');
  const comparisonAfterImage = appContainer.querySelector<HTMLImageElement>('#comparison-after-image');
  const comparisonSliderHandle = appContainer.querySelector<HTMLDivElement>('#comparison-slider-handle');
  const lightPlacementTool = appContainer.querySelector<HTMLDivElement>('#light-placement-tool');
  const overlayDivider = appContainer.querySelector<HTMLDivElement>('.divider');


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
  const fullscreenModal = document.querySelector<HTMLDivElement>('#fullscreen-modal');
  const fullscreenImage = document.querySelector<HTMLImageElement>('#fullscreen-image');
  const closeModalBtn = document.querySelector<HTMLButtonElement>('#close-modal-btn');
  const prevImageBtn = document.querySelector<HTMLButtonElement>('#prev-image-btn');
  const nextImageBtn = document.querySelector<HTMLButtonElement>('#next-image-btn');
  const copyModalBtn = document.querySelector<HTMLButtonElement>('#copy-modal-btn'); // NEW: Copy button
  
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
  let draggedMarker: LightMarker | null = null;


  // State for fullscreen navigation
  let currentGallery: ImagePart[] = [];
  let currentImageIndex = -1;
  // State for gallery selection
  let selectedHistoryIndices = new Set<number>();
  
  const MAX_HISTORY_SIZE = 20; // Limit history to prevent UI clutter

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
        // 1. Create an Image element to load the data
        const img = new Image();
        img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // 2. Draw to canvas to ensure we get a clean PNG Blob
        // ClipboardItem requires specific formats, usually 'image/png'
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Could not get canvas context");
        
        ctx.drawImage(img, 0, 0);
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) throw new Error("Failed to create blob");

        // 3. Write to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        
        return true;
    } catch (err) {
        console.error("Failed to copy image: ", err);
        alert("Failed to copy image to clipboard. " + err);
        return false;
    }
  };

  // --- CANVAS HELPER FUNCTIONS (Moved up to fix hoisting) ---

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
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;

    lightMarkers.forEach(marker => {
        ctx.fillStyle = 'rgba(74, 144, 226, 0.8)';
        
        if (marker.shape === 'cone') {
            ctx.save();
            ctx.translate(marker.x, marker.y);
            ctx.rotate(marker.rotation);
            
            ctx.beginPath();
            const tipY = -marker.size * 0.75;
            const baseY = marker.size * 0.75;
            const baseHalfWidth = marker.size;
            
            ctx.moveTo(0, tipY); 
            ctx.lineTo(-baseHalfWidth, baseY); 
            ctx.lineTo(baseHalfWidth, baseY); 
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        } else { 
            ctx.beginPath();
            ctx.arc(marker.x, marker.y, marker.size, 0, Math.PI * 2);
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
        generateBtn.disabled = !isPromptFilled; // Prompt is sufficient in free mode
        generateBtn.textContent = 'Generate';
      } else if (currentMode === 'analyze') {
        generateBtn.disabled = !isImageLoaded || !isPromptFilled; // Both image and prompt needed for analysis
        generateBtn.textContent = 'Анализировать изображение';
      } else {
        generateBtn.disabled = !isImageLoaded || !isPromptFilled;
        generateBtn.textContent = 'Generate'; 
      }
    }
    
    const allPresetButtons = appContainer.querySelectorAll<HTMLButtonElement>('.preset-btn, .lighting-preset-btn');
    allPresetButtons.forEach(btn => {
        btn.disabled = !isImageLoaded;
    });

    if (currentMode === 'character' || currentMode === 'match3' || currentMode === 'inpaint' || currentMode === 'sketch') {
      const regularPresets = appContainer.querySelectorAll<HTMLButtonElement>('.preset-btn');
      regularPresets.forEach(btn => {
        btn.disabled = !isImageLoaded;
      });
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
      default:
        promptInput.placeholder = defaultPromptPlaceholder || 'Describe your request...';
    }
  };
  
  const analyzeAndSetTemperature = async (imagePart: ImagePart) => {
    if (!temperatureSlider || !temperatureValue) return;

    // Set loading state
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
            config: {
                temperature: 0, 
            }
        });

        const tempStr = response.text.trim();
        let tempNum = parseInt(tempStr, 10);

        if (!isNaN(tempNum)) {
            tempNum = Math.max(1000, Math.min(10000, tempNum));
            temperatureSlider.value = String(tempNum);
            temperatureValue.textContent = String(tempNum);
        } else {
            console.warn('Failed to parse temperature from model, defaulting to 5000K.', tempStr);
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
        // The ResizeObserver will handle the canvas resize
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
        removeBtn.ariaLabel = 'Remove reference image';
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
              if (!ctx) {
                  return reject(new Error('Could not get canvas context'));
              }

              ctx.fillStyle = '#808080'; 
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

  // --- MAIN LOGIC ---

  const handleGenerateClick = async () => {
    if (!generateBtn || !imageGallery) {
      return;
    }
    
    if ((currentMode !== 'free' || uploadedImage) && !uploadedImage) {
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

      // --- Determine Model and API based on Mode and Input ---
      if (currentMode === 'lighting') {
          currentModelName = 'gemini-2.5-flash-image';
          generationAPI = 'generateContent';
          
          if (referenceImages.length > 0 && uploadedImage) {
              finalPrompt = "Apply the lighting style, mood, and color scheme from the second image (the reference) to the first image (the main subject). Maintain the character and pose from the first image. The first image is the primary subject, and the second is the lighting reference.";
              apiRequestPayload = {
                  model: currentModelName,
                  contents: {
                      parts: [
                          { inlineData: { data: uploadedImage!.data, mimeType: uploadedImage!.mimeType } },
                          { inlineData: { data: referenceImages[0].data, mimeType: referenceImages[0].mimeType } },
                          { text: finalPrompt }
                      ]
                  },
                  config: {
                      responseModalities: [Modality.IMAGE],
                      temperature: 0.4, 
                  },
              };
          } else if (lightMarkers.length > 0 && lightingOverlayCanvas) {
              const { width, height } = lightingOverlayCanvas;
              const colorValue = lightColorPicker?.value || '#FFFFFF';

              const angleToDirection = (angleRad: number): string => {
                  const angleDeg = ((angleRad * 180 / Math.PI) + 360 + 90) % 360; 
                  if (angleDeg >= 337.5 || angleDeg < 22.5) return 'top';
                  if (angleDeg >= 22.5 && angleDeg < 67.5) return 'top-right';
                  if (angleDeg >= 67.5 && angleDeg < 112.5) return 'right';
                  if (angleDeg >= 112.5 && angleDeg < 157.5) return 'bottom-right';
                  if (angleDeg >= 157.5 && angleDeg < 202.5) return 'bottom';
                  if (angleDeg >= 202.5 && angleDeg < 247.5) return 'bottom-left';
                  if (angleDeg >= 247.5 && angleDeg < 292.5) return 'left';
                  if (angleDeg >= 292.5 && angleDeg < 337.5) return 'top-left';
                  return '';
              };

              const convertCoordsToDescription = (marker: LightMarker, w: number, h: number): string => {
                  const {x, y, size, shape, rotation} = marker;
                  const yPos = y < h / 3 ? 'top' : (y > h * 2 / 3 ? 'bottom' : 'middle');
                  const xPos = x < w / 3 ? 'left' : (x > w * 2 / 3 ? 'right' : 'center');
                  const location = (yPos === 'middle' && xPos === 'center') ? 'from the center' : `from the ${yPos} ${xPos}`;
                  
                  const sizeDesc = size < 15 ? 'small' : (size < 35 ? 'medium' : 'large');
                  const colorDesc = colorValue.toUpperCase() === '#FFFFFF' ? '' : `with the color ${colorValue} `;

                  if (shape === 'cone') {
                      const direction = angleToDirection(rotation);
                      return `a ${sizeDesc} cone of light (spotlight) ${colorDesc}${location}, pointing towards the ${direction}`;
                  } else {
                       return `a ${sizeDesc} circular (omni-directional) light source ${colorDesc}${location}`;
                  }
              };
      
              const descriptions = lightMarkers.map(marker => convertCoordsToDescription(marker, width, height));
              const locations = descriptions.join(' and ');
              const placementPrompt = `Add specific light sources: ${locations}.`;

              if (promptInput?.value.trim()) {
                  finalPrompt = `${promptInput.value.trim()}. ${placementPrompt}`;
              } else {
                  finalPrompt = placementPrompt;
              }

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
          } else {
              if (promptInput?.value.trim()) {
                finalPrompt = promptInput.value.trim();
              } else {
                const tempValue = temperatureSlider?.value || '5000';
                const colorValue = lightColorPicker?.value || '#FFFFFF';
                finalPrompt = `Adjust the lighting of the image. Set the overall color temperature to approximately ${tempValue}K. If relevant, tint the primary light source with the color ${colorValue}.`;
              }
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
              config: {
                  responseModalities: [Modality.TEXT], 
                  temperature: temperature,
              },
          };
      }
      else if (currentMode === 'free') {
          // Free mode: Strictly IGNORE the main image (uploadedImage), even if it exists.
          
          if (referenceImages.length > 0) {
              // Free mode with references (Text + Images).
              currentModelName = 'gemini-2.5-flash-image'; 
              generationAPI = 'generateContent';
              const allParts: (object)[] = [];
              const referenceImageParts = referenceImages.map(refImg => ({
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
                  },
              };
          } else {
              // Free mode, no references. Pure text-to-image.
              currentModelName = 'imagen-4.0-generate-001';
              generationAPI = 'generateImages';
              apiRequestPayload = {
                  model: currentModelName,
                  prompt: finalPrompt,
                  config: {
                      numberOfImages: generationCount,
                      outputMimeType: 'image/png', // CHANGED to PNG as requested
                      aspectRatio: selectedAspectRatio,
                  },
              };
          }
      } else {
          // All other modes (Character, Match3, Inpaint, Sketch)
          currentModelName = 'gemini-2.5-flash-image'; 
          generationAPI = 'generateContent';
          const allParts: (object)[] = [];

          // 1. Add the main image if available
          if (uploadedImage) {
              allParts.push({
                  inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType },
              });
          }
          
          // 2. Add mask if in inpaint mode
          if (currentMode === 'inpaint' && maskCanvas && imagePreview && !isCanvasBlank(maskCanvas) && uploadedImage) {
              const originalWidth = imagePreview.naturalWidth;
              const originalHeight = imagePreview.naturalHeight;
          
              if (originalWidth > 0 && originalHeight > 0) {
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
                      const finalMaskCtx = finalMaskCanvas.getContext('2d');
          
                      if (finalMaskCtx) {
                          finalMaskCtx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);
                          const maskDataUrl = finalMaskCanvas.toDataURL('image/png');
                          const maskBase64 = maskDataUrl.substring(maskDataUrl.indexOf(',') + 1);
                          allParts.push({ inlineData: { mimeType: 'image/png', data: maskBase64 } });
                      }
                  }
              } else {
                  console.warn("Could not determine original image dimensions. Mask will not be sent.");
              }
          }
          
          // 3. Add reference images, pre-processing them to match the main image's aspect ratio.
          if (currentMode !== 'inpaint' && referenceImages.length > 0 && uploadedImage) { 
              let processedReferenceImages: ImagePart[] = referenceImages;
              try {
                  const mainImageDimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
                      const img = new Image();
                      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                      img.onerror = (err) => reject(new Error('Could not load main image to get dimensions'));
                      img.src = `data:${uploadedImage.mimeType};base64,${uploadedImage.data}`;
                  });
      
                  if (mainImageDimensions.width > 0 && mainImageDimensions.height > 0) {
                      const resizePromises = referenceImages.map(refImg => 
                          resizeRefToMatchAspectRatio(refImg, mainImageDimensions.width, mainImageDimensions.height)
                      );
                      processedReferenceImages = await Promise.all(resizePromises);
                  }
              } catch (resizeError) {
                  console.error("Could not resize reference images, sending originals as a fallback.", resizeError);
                  processedReferenceImages = referenceImages;
              }
      
              const referenceImageParts = processedReferenceImages.map(refImg => ({
                  inlineData: { data: refImg.data, mimeType: refImg.mimeType }
              }));
              allParts.push(...referenceImageParts);
              
              finalPrompt = `This is an image editing task with references. You are given a primary image to edit, and one or more reference images. **Do not edit the reference images.** Your task is to apply the requested edit to the primary image only, using the reference images for guidance. The primary image is the first one in the sequence. Preserve its aspect ratio. The user's request is: "${finalPrompt}"`;
          }

          // 4. Add the text prompt
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

      // --- Execute API Call(s) ---
      const activeGenCount = (currentMode === 'analyze') ? 1 : generationCount;
      const MAX_TOTAL_ATTEMPTS = activeGenCount * 3;
      let attempts = 0;
      
      while(resultImages.length < activeGenCount && attempts < MAX_TOTAL_ATTEMPTS) {
          if (isTextOutputMode) { 
              generationCount = 1;
          }
          const needed = activeGenCount - resultImages.length;
          if (attempts > 0) {
              await new Promise(resolve => setTimeout(resolve, 500));
          }
          console.log(`Attempting to generate ${needed} more image(s) or get text response...`);

          if (generationAPI === 'generateContent') {
              const generationPromises = Array(needed).fill(null).map(() =>
                  ai.models.generateContent(apiRequestPayload)
              );
              attempts += needed;
              const results = await Promise.allSettled(generationPromises);
              for (const result of results) {
                  if (result.status === 'fulfilled') {
                      const response = result.value;
                      if (isTextOutputMode) {
                          imageGallery.innerHTML = '';
                          const textResult = response.text;
                          setGalleryMessage(textResult, false, true); 
                          break; 
                      } else {
                          if (response.candidates && response.candidates.length > 0) {
                              const imagePartFound = response.candidates[0].content.parts.find(part => part.inlineData);
                              if (imagePartFound && imagePartFound.inlineData) {
                                  if (resultImages.length < activeGenCount) {
                                     resultImages.push({
                                          mimeType: imagePartFound.inlineData.mimeType,
                                          data: imagePartFound.inlineData.data,
                                      });
                                  }
                              } else { console.warn('Successful response but no image data found.', response); }
                          } else { console.warn('Received a successful response with no candidates:', response); }
                      }
                  } else { console.error('A generation request failed:', result.reason); }
              }
              if (isTextOutputMode) break; 
          } else if (generationAPI === 'generateImages') {
              const imgRequestPayload = { ...apiRequestPayload, config: { ...apiRequestPayload.config, numberOfImages: needed } };
              attempts += needed; 

              try {
                  const response = await ai.models.generateImages(imgRequestPayload);
                  if (response.generatedImages && response.generatedImages.length > 0) {
                      for (const genImage of response.generatedImages) {
                          if (genImage.image?.imageBytes) {
                              if (resultImages.length < activeGenCount) {
                                  resultImages.push({
                                      mimeType: 'image/png', // Force PNG client side MIME if received
                                      data: genImage.image.imageBytes,
                                  });
                              }
                          }
                      }
                  } else { console.warn('Successful generateImages response but no images found.', response); }
              } catch (error) { console.error('A generateImages request failed:', error); }
          }
          if (!isTextOutputMode) {
            setGalleryMessage(`Generating... ${resultImages.length} / ${activeGenCount} complete.`);
          }
      }

      if (resultImages.length > 0) {
        imageGallery.innerHTML = ''; 
        
        // Check if we should enable comparison (Supported modes AND original image exists)
        const supportsComparison = ['character', 'sketch', 'inpaint', 'match3', 'lighting'].includes(currentMode);

        if (supportsComparison && uploadedImage && comparisonAfterImage) {
            const newImagePart = resultImages[0];
            comparisonAfterImage.src = `data:${newImagePart.mimeType};base64,${newImagePart.data}`;
            
            if (toggleComparisonBtn) {
                toggleComparisonBtn.disabled = false;
            }
        }
        
        resultImages.forEach((imagePart, index) => {
            const galleryButton = document.createElement('button');
            galleryButton.className = 'gallery-item';
            galleryButton.setAttribute('aria-label', 'View this image fullscreen');
            
            galleryButton.onclick = () => {
                // Update comparison image on click if supported
                const supportsComparison = ['character', 'sketch', 'inpaint', 'match3', 'lighting'].includes(currentMode);
                if (supportsComparison && uploadedImage && comparisonAfterImage && toggleComparisonBtn) {
                    const clickedImage = resultImages[index];
                    comparisonAfterImage.src = `data:${clickedImage.mimeType};base64,${clickedImage.data}`;
                    toggleComparisonBtn.disabled = false; 
                }
                openModal(resultImages, index);
            };

            const img = document.createElement('img');
            img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
            img.alt = prompt;

            galleryButton.appendChild(img);
            imageGallery.appendChild(galleryButton);
        });
        
        if (resultImages.length < activeGenCount) {
            const warningEl = document.createElement('p');
            warningEl.textContent = `Could only generate ${resultImages.length} of the requested ${activeGenCount} images.`;
            warningEl.className = 'error';
            imageGallery.appendChild(warningEl);
        }

        if (!isTextOutputMode) {
            history.push(...resultImages);
            if (history.length > MAX_HISTORY_SIZE) {
                history.splice(0, history.length - MAX_HISTORY_SIZE);
            }
            renderHistory();
        }

      } else if (!isTextOutputMode) { 
        setGalleryMessage('The model did not return any images after multiple retries. Please try a different prompt or check your connection.', true);
      } else if (isTextOutputMode && imageGallery.innerHTML === '') { 
        setGalleryMessage('The model did not return any analysis text. Please try again.', true, true);
      }
    } catch (error) {
      console.error('Error generating image/text:', error);
      setGalleryMessage('An error occurred. Please check the console for details.', true);
    } finally {
      if (promptInput && currentMode === 'lighting') {
          promptInput.value = ''; 
          clearLightMarkers();
          if (toggleLightPlacementBtn && lightProperties) {
              isPlacingLight = false;
              toggleLightPlacementBtn.classList.remove('active');
              lightProperties.classList.add('hidden');
              imagePreviewContainer?.classList.remove('light-placement-active');
          }
      }
      updateButtonState();
    }
  };
  
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

  const handleImageUploadEvent = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        processMainImageFile(files[0]); 
    }
  };

  const handleReferenceUploadEvent = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        processReferenceFiles(files);
        target.value = ''; 
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    imagePreviewContainer?.classList.add('drag-over');
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    imagePreviewContainer?.classList.remove('drag-over');
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    imagePreviewContainer?.classList.remove('drag-over');
    
    const historyItemJson = e.dataTransfer?.getData('application/json');
    if (historyItemJson) {
        try {
            const imagePart: ImagePart = JSON.parse(historyItemJson);
            if (imagePart && typeof imagePart.mimeType === 'string' && typeof imagePart.data === 'string') {
                const file = new File([Uint8Array.from(atob(imagePart.data), c => c.charCodeAt(0))], 'dropped_history_image.png', { type: imagePart.mimeType });
                processMainImageFile(file);
            }
        } catch (err) {
            console.error("Failed to parse dropped history item:", err);
        }
        return; 
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        processMainImageFile(files[0]); 
    }
  };

  const handleReferenceDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (referenceUploadArea) {
      referenceUploadArea.classList.add('drag-over');
    }
  };

  const handleReferenceDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (referenceUploadArea) {
      referenceUploadArea.classList.remove('drag-over');
    }
  };

  const handleReferenceDrop = async (e: DragEvent) => {
    e.preventDefault();
    if (referenceUploadArea) {
      referenceUploadArea.classList.remove('drag-over');
    }
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        await processReferenceFiles(files);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    let pastedImageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                pastedImageFile = file;
                break; 
            }
        }
    }
    if (pastedImageFile) {
        processMainImageFile(pastedImageFile);
        event.preventDefault(); 
    }
  };

  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e, maskCanvas!);
    if (!maskCtx || !coords) return;
    
    saveMaskState(); 

    isDrawing = true;
    [lastX, lastY] = [coords.x, coords.y];

    maskCtx.beginPath();
    maskCtx.arc(coords.x, coords.y, maskCtx.lineWidth / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e, maskCanvas!);
    if (!maskCtx || !coords) return;

    maskCtx.beginPath();
    maskCtx.moveTo(lastX, lastY);
    maskCtx.lineTo(coords.x, coords.y);
    maskCtx.stroke();
    [lastX, lastY] = [coords.x, coords.y];
  };

  const stopDrawing = () => {
    if (isDrawing) {
        isDrawing = false;
        maskCtx?.beginPath(); 
    }
  };

  const setupCanvases = () => {
    if (!maskCanvas || !imagePreview || !brushSizeSlider || !brushCursor || !lightingOverlayCanvas || !lightSizeSlider || !lightShapeSelector || !imageViewport) return;
    maskCtx = maskCanvas.getContext('2d');
    lightingOverlayCtx = lightingOverlayCanvas.getContext('2d');
    if (!maskCtx || !lightingOverlayCtx) return;

    maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    maskCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    maskCtx.lineWidth = parseInt(brushSizeSlider.value, 10);
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
                maskCtx.lineJoin = 'round';
            }
            clearMask(); 
            clearLightMarkers(); 
        }
    });
    resizeObserver.observe(imagePreview);

    updateBrushCursorSize();
    maskCanvas.addEventListener('mouseenter', () => brushCursor.classList.remove('hidden'));
    maskCanvas.addEventListener('mouseleave', () => brushCursor.classList.add('hidden'));
    maskCanvas.addEventListener('mousemove', (e) => {
        brushCursor.style.left = `${e.clientX}px`;
        brushCursor.style.top = `${e.clientY}px`;
        draw(e);
    });

    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mouseup', stopDrawing);
    maskCanvas.addEventListener('mouseout', stopDrawing);
    maskCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    maskCanvas.addEventListener('touchmove', draw, { passive: false });
    maskCanvas.addEventListener('touchend', stopDrawing);

    saveMaskState(); 

    lightingOverlayCanvas.addEventListener('mousedown', (e) => {
        if (!isPlacingLight) return;
        const coords = getCoords(e, lightingOverlayCanvas);
        if (!coords) return;

        const clickedMarker = lightMarkers.find(marker => {
             const dx = marker.x - coords.x;
             const dy = marker.y - coords.y;
             return marker.shape === 'cone' && (dx * dx + dy * dy) < marker.size * marker.size;
        });

        if (clickedMarker) {
            draggedMarker = clickedMarker;
            imageViewport.classList.add('grabbing');
        } else {
            const size = parseInt(lightSizeSlider.value, 10);
            const shape = lightShapeSelector.querySelector<HTMLInputElement>('input[name="light-shape"]:checked')?.value as 'circle' | 'cone';
            lightMarkers.push({ ...coords, size, shape, rotation: 0 });
            drawLightMarkers();
            if (clearLightSourcesBtn) clearLightSourcesBtn.classList.remove('hidden');
        }
    });

    lightingOverlayCanvas.addEventListener('mousemove', (e) => {
        if (draggedMarker) {
            const coords = getCoords(e, lightingOverlayCanvas);
            if (coords) {
                const dx = coords.x - draggedMarker.x;
                const dy = coords.y - draggedMarker.y;
                draggedMarker.rotation = Math.atan2(dy, dx) - Math.PI / 2; 
                drawLightMarkers();
            }
        }
    });

    const stopDraggingMarker = () => {
        draggedMarker = null;
        imageViewport.classList.remove('grabbing');
    }

    lightingOverlayCanvas.addEventListener('mouseup', stopDraggingMarker);
    lightingOverlayCanvas.addEventListener('mouseleave', stopDraggingMarker);
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
    if (fullscreenModal) {
        fullscreenModal.classList.add('modal-hidden');
    }
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

  const updateDownloadButtonState = () => {
    if (downloadSelectedBtn) {
        const count = selectedHistoryIndices.size;
        downloadSelectedBtn.disabled = count === 0;

        if (count === 0) {
            downloadSelectedBtn.textContent = 'Загрузить выбранное';
        } else if (count === 1) {
            downloadSelectedBtn.textContent = 'Загрузить 1 изображение';
        } else {
            downloadSelectedBtn.textContent = `Загрузить ZIP (${count} изображений)`;
        }
    }
  };

  const handleDownloadSelected = async () => {
    if (!downloadSelectedBtn || selectedHistoryIndices.size === 0) return;

    const prefix = filenamePrefixInput?.value.trim() || 'image';
    const selectedCount = selectedHistoryIndices.size;

    downloadSelectedBtn.disabled = true;

    if (selectedCount === 1) {
        downloadSelectedBtn.textContent = 'Загрузка...';
        const index = selectedHistoryIndices.values().next().value;
        const imagePart = history[index];
        const fileExtension = imagePart.mimeType.split('/')[1] || 'png';
        const filename = `${prefix}.${fileExtension}`;
        
        const link = document.createElement('a');
        link.href = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        downloadSelectedBtn.textContent = 'Архивация...';
        const zip = new JSZip();
        let count = 1;

        const promises = Array.from(selectedHistoryIndices).map(index => {
            const imagePart = history[index];
            const fileExtension = imagePart.mimeType.split('/')[1] || 'png';
            const filename = `${prefix}_${count++}.${fileExtension}`;
            return zip.file(filename, imagePart.data, { base64: true });
        });

        await Promise.all(promises);

        const content = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${prefix}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    updateDownloadButtonState();
  };

  const openGalleryModal = () => {
    if (!galleryModal || !galleryGrid) return;
    
    galleryGrid.innerHTML = ''; 
    selectedHistoryIndices.clear(); 
    updateDownloadButtonState();

    if (history.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'Your history is empty.';
        galleryGrid.appendChild(placeholder);
    } else {
        history.forEach((imagePart, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-grid-item';
            galleryItem.setAttribute('aria-label', `Image ${index + 1} from history`);
            galleryItem.setAttribute('role', 'button');
            galleryItem.tabIndex = 0;
            
            galleryItem.onclick = () => {
                if (selectedHistoryIndices.has(index)) {
                    selectedHistoryIndices.delete(index);
                    galleryItem.classList.remove('selected');
                } else {
                    selectedHistoryIndices.add(index);
                    galleryItem.classList.add('selected');
                }
                updateDownloadButtonState();
            };

            const img = document.createElement('img');
            img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
            img.alt = `Generated image ${index + 1}`;

            const overlay = document.createElement('div');
            overlay.className = 'gallery-item-overlay';

            const actions = document.createElement('div');
            actions.className = 'gallery-item-actions';

            const selectCheckbox = document.createElement('div');
            selectCheckbox.className = 'select-checkbox';
            selectCheckbox.setAttribute('aria-label', 'Select this image');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-btn';
            viewBtn.setAttribute('aria-label', 'View this image fullscreen');
            viewBtn.onclick = (e) => {
                e.stopPropagation(); 
                openModal(history, index);
            };
            
            actions.appendChild(selectCheckbox);
            actions.appendChild(viewBtn);

            galleryItem.appendChild(img);
            galleryItem.appendChild(overlay);
            galleryItem.appendChild(actions);
            galleryGrid.appendChild(galleryItem);
        });
    }

    galleryModal.classList.remove('modal-hidden');
  };

  const closeGalleryModal = () => {
      if (galleryModal) {
          galleryModal.classList.add('modal-hidden');
      }
  };

  const renderHistory = () => {
    if (!historyGallery) return;
    historyGallery.innerHTML = '';

    if (history.length === 0) {
        const placeholder = document.createElement('p');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'Generated images will appear here.';
        historyGallery.appendChild(placeholder);
        return;
    }

    const displayCount = 10;
    const startIndex = Math.max(0, history.length - displayCount);
    
    for (let i = history.length - 1; i >= startIndex; i--) {
        const imagePart = history[i];
        const originalIndex = i; 

        const historyItem = document.createElement('button');
        historyItem.className = 'history-item';
        historyItem.setAttribute('aria-label', 'View this image fullscreen or drag to canvas');
        historyItem.onclick = () => openModal(history, originalIndex);

        historyItem.draggable = true;
        historyItem.addEventListener('dragstart', (e) => {
            try {
                if (e.dataTransfer) {
                    const jsonData = JSON.stringify(imagePart);
                    e.dataTransfer.setData('application/json', jsonData);
                    e.dataTransfer.effectAllowed = 'copy';
                }
            } catch (error) {
                console.error("Failed to serialize history item for drag-and-drop:", error);
            }
        });

        const img = document.createElement('img');
        img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
        img.alt = 'Previously generated image';
        img.draggable = false; 

        historyItem.appendChild(img);
        historyGallery.appendChild(historyItem);
    }
  }


  // Initial state and event listeners
  if (imageUploadInput && promptInput && generateBtn && imagePreviewContainer && modeTabs && presetButtonsContainer && resultContainer && referenceUploadInput && referenceUploadArea && aspectRatioSelector && inpaintControls && brushSizeSlider && brushModeBtn && eraserModeBtn && undoMaskBtn && clearMaskBtn && removeMaskBtn && mainImageUploadContainer && promptInputContainer && fqaContentContainer && negativePromptContainer && creativitySliderContainer && generationCountSelector && lightingControlsContainer && temperatureSlider && temperatureValue && lightColorPicker && lightingOverlayCanvas && imageViewport && imageOverlayControls && toggleComparisonBtn && toggleLightPlacementBtn && lightProperties && lightSizeSlider && lightShapeSelector && clearLightSourcesBtn && comparisonAfterContainer && comparisonAfterImage && comparisonSliderHandle) {
    
    if (promptInput) {
        defaultPromptPlaceholder = promptInput.placeholder; 
    }

    imageUploadInput.addEventListener('change', handleImageUploadEvent);
    referenceUploadInput.addEventListener('change', handleReferenceUploadEvent);
    promptInput.addEventListener('input', updateButtonState);
    generateBtn.addEventListener('click', handleGenerateClick);
    
    temperatureSlider.addEventListener('input', () => {
        const value = parseInt(temperatureSlider.value, 10);
        temperatureValue.textContent = String(value);
    });

    toggleLightPlacementBtn.addEventListener('click', () => {
        isPlacingLight = !isPlacingLight;
        toggleLightPlacementBtn.classList.toggle('active', isPlacingLight);
        lightProperties.classList.toggle('hidden', !isPlacingLight);
        imagePreviewContainer.classList.toggle('light-placement-active', isPlacingLight);
        if (!isPlacingLight) {
             draggedMarker = null;
             imageViewport.classList.remove('grabbing');
        } else {
            clearLightSourcesBtn.classList.toggle('hidden', lightMarkers.length === 0);
        }
    });
    
    clearLightSourcesBtn.addEventListener('click', clearLightMarkers);
    
    lightingPresetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!uploadedImage || !promptInput) return;
            const prompt = button.dataset.prompt;
            if (prompt) {
                promptInput.value = prompt;
                handleGenerateClick(); 
            }
        });
    });

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
        e.stopPropagation(); 
        isDraggingSlider = true;
        imageViewport.classList.add('grabbing');
    });

    comparisonSliderHandle.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    window.addEventListener('mouseup', () => {
        isDraggingSlider = false;
        imageViewport.classList.remove('grabbing');
    });
    
    window.addEventListener('mousemove', (e) => {
        if (isDraggingSlider) {
            moveSlider(e.clientX);
        }
    });

    if (creativitySlider && creativityValue) {
        creativitySlider.addEventListener('input', () => {
            creativityValue.textContent = creativitySlider.value;
        });
    }

    numButtons.forEach(button => {
        button.addEventListener('click', () => {
            generationCount = parseInt(button.dataset.count || '1', 10);
            numButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
        });
    });

    aspectRatioButtons.forEach(button => {
      button.addEventListener('click', () => {
        selectedAspectRatio = button.dataset.ratio || '1:1';
        aspectRatioButtons.forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      });
    });

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
    imagePreviewContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
             if (currentMode !== 'inpaint' && !isPlacingLight) {
                imageUploadInput.click();
            }
        }
    });

    imagePreviewContainer.addEventListener('dragover', handleDragOver);
    imagePreviewContainer.addEventListener('dragleave', handleDragLeave);
    imagePreviewContainer.addEventListener('drop', handleDrop);
    
    referenceUploadArea.addEventListener('dragover', handleReferenceDragOver);
    referenceUploadArea.addEventListener('dragleave', handleReferenceDragLeave);
    referenceUploadArea.addEventListener('drop', handleReferenceDrop);

    window.addEventListener('paste', handlePaste);

    modeTabs.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.matches('.tab-btn')) {
        
        // Save the current prompt before switching modes
        if (promptInput) {
            modePrompts[currentMode] = promptInput.value;
        }

        const mode = target.dataset.mode || 'character';
        currentMode = mode;
        
        modeTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        target.classList.add('active');
        target.setAttribute('aria-selected', 'true');

        const isCharacter = mode === 'character';
        const isInpaint = mode === 'inpaint';
        const isMatch3 = mode === 'match3';
        const isSketch = mode === 'sketch';
        const isFree = mode === 'free';
        const isFQA = mode === 'fqa';
        const isAnalyzeMode = mode === 'analyze';
        const isLighting = mode === 'lighting';

        if (isFQA) {
          mainImageUploadContainer.classList.add('hidden');
          promptInputContainer.classList.add('hidden');
          resultContainer.classList.add('hidden');
          fqaContentContainer.classList.remove('hidden');

          uploadedImage = null;
          referenceImages = [];
          processMainImageFile(null);
          renderReferenceImages();
          if (promptInput) promptInput.value = '';
          
          if (brushCursor) { brushCursor.classList.add('hidden'); }
          referenceUploadArea.classList.add('hidden');
          referencePreviewContainer.classList.add('hidden');
          inpaintControls?.classList.add('hidden');
          presetButtonsContainer.classList.add('hidden');
          match3PresetButtonsContainer?.classList.add('hidden');
          negativePromptContainer?.classList.add('hidden');
          creativitySliderContainer?.classList.add('hidden');
          generationCountSelector?.classList.add('hidden');
          aspectRatioSelector?.classList.add('hidden');
          lightingControlsContainer?.classList.add('hidden');
          imageOverlayControls?.classList.add('hidden');

        } else { 
            mainImageUploadContainer.classList.remove('hidden');
            promptInputContainer.classList.remove('hidden');
            resultContainer.classList.remove('hidden');
            fqaContentContainer.classList.add('hidden');
            
            let showPresets = isCharacter;
            let showMatch3Presets = isMatch3;
            let showInpaintControls = isInpaint;
            let showAspectRatio = isFree;
            let showReferenceUpload = true;
            let showNegativePrompt = true;
            let showCreativity = true;
            let showGenCount = true;
            let showLightingControls = isLighting;
            let showPromptInput = true;
            
            // Show overlay controls for any mode that supports comparison (if image is loaded) OR lighting
            const supportsComparison = ['character', 'sketch', 'inpaint', 'match3', 'lighting'].includes(mode);
            let showOverlayControls = supportsComparison;


            if (isAnalyzeMode) {
                showPresets = false;
                showMatch3Presets = false;
                showNegativePrompt = false;
                showCreativity = false;
                showGenCount = false;
                showAspectRatio = false;
                showInpaintControls = false;
                showLightingControls = false;
                showOverlayControls = false;
            } else if (isLighting) {
                showPresets = false;
                showMatch3Presets = false;
                showNegativePrompt = false;
                showCreativity = false;
                showGenCount = true; 
                showAspectRatio = false;
                showInpaintControls = false;
                showReferenceUpload = true;
                showPromptInput = true; 
                toggleComparisonBtn.disabled = !comparisonAfterImage.src;
            }

            presetButtonsContainer.classList.toggle('hidden', !showPresets);
            match3PresetButtonsContainer?.classList.toggle('hidden', !showMatch3Presets);
            inpaintControls?.classList.toggle('hidden', !showInpaintControls);
            aspectRatioSelector?.classList.toggle('hidden', !showAspectRatio);
            referenceUploadArea.classList.toggle('hidden', !showReferenceUpload);
            negativePromptContainer?.classList.toggle('hidden', !showNegativePrompt);
            creativitySliderContainer?.classList.toggle('hidden', !showCreativity);
            generationCountSelector?.classList.toggle('hidden', !showGenCount);
            lightingControlsContainer?.classList.toggle('hidden', !showLightingControls);
            promptInputWrapper?.classList.toggle('hidden', !showPromptInput);
            imageOverlayControls.classList.toggle('hidden', !showOverlayControls);

            // Toggle specific tools inside the overlay
            if (lightPlacementTool) {
                lightPlacementTool.classList.toggle('hidden', !isLighting);
            }
            if (overlayDivider) {
                overlayDivider.classList.toggle('hidden', !isLighting);
            }
            
            const hideImagePreviewForFreeMode = isFree;
            imagePreviewContainer.classList.toggle('hidden', hideImagePreviewForFreeMode);
            imagePreviewContainer.classList.toggle('inpaint-active', isInpaint);
            
            imagePreviewContainer.classList.remove('light-placement-active');
            isPlacingLight = false;
            if (toggleLightPlacementBtn && lightProperties) {
                toggleLightPlacementBtn.classList.remove('active');
                lightProperties.classList.add('hidden');
            }
            hideComparisonView();

            if (!isInpaint && brushCursor) {
                brushCursor.classList.add('hidden');
            }
            
            if (!showReferenceUpload) {
                referenceImages = [];
                renderReferenceImages();
            }

            if (isLighting && uploadedImage) {
                analyzeAndSetTemperature(uploadedImage);
            }
        }
        
        // Restore the prompt for the new mode
        if (promptInput) {
            promptInput.value = modePrompts[currentMode] || '';
        }

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
    setupPresetButton('preset-remove-bg', 'Удалить фон. Верни изображение в формате PNG с прозрачным фоном.');
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
            if (e.target === fullscreenModal) {
                closeModal();
            }
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
      closeGalleryBtn.addEventListener('click', closeGalleryModal);
      downloadSelectedBtn.addEventListener('click', handleDownloadSelected);
      galleryModal.addEventListener('click', (e) => {
          if (e.target === galleryModal) {
              closeGalleryModal();
          }
      });
    }

    window.addEventListener('keydown', async (e) => {
        // Fullscreen Modal Shortcuts
        if (fullscreenModal && !fullscreenModal.classList.contains('modal-hidden')) {
             if (e.key === 'Escape') closeModal();
             if (e.key === 'ArrowLeft') showPrevImage();
             if (e.key === 'ArrowRight') showNextImage();
             
             // Ctrl+C or Cmd+C to copy
             if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                 e.preventDefault(); // Prevent default copy event
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
            if (e.key === 'Escape') closeGalleryModal();
        }
    });

    setupCanvases();
    setGalleryMessage('Your generated image will appear here.');
    renderHistory();
    
    const defaultTabButton = appContainer.querySelector<HTMLButtonElement>('#tab-character');
    if (defaultTabButton) {
        defaultTabButton.click();
    }
  }
}
