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
  
  // Aspect Ratio selector elements
  const aspectRatioSelector = appContainer.querySelector<HTMLDivElement>('#aspect-ratio-selector');
  const aspectRatioButtons = appContainer.querySelectorAll<HTMLButtonElement>('.aspect-ratio-btn');
  
  // Magic Prompt Button
  const magicEnhanceBtn = appContainer.querySelector<HTMLButtonElement>('#magic-enhance-btn');
  const clearMainImageBtn = appContainer.querySelector<HTMLButtonElement>('#clear-image-btn');

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
  const copyImageBtn = document.querySelector<HTMLButtonElement>('#copy-image-btn');
  
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

  const setGalleryMessage = (message: string, isError = false, isRawText = false) => {
    if (imageGallery) {
      imageGallery.innerHTML = '';
      const messageEl = document.createElement(isRawText ? 'pre' : 'p'); // Use <pre> for raw text to preserve formatting
      messageEl.textContent = message;
      messageEl.className = isError ? 'error' : 'placeholder';
      if (isRawText) messageEl.classList.add('raw-text-output');
      imageGallery.appendChild(messageEl);
    }
  };
  
  const updateModalContent = () => {
    if (!fullscreenImage || !prevImageBtn || !nextImageBtn) return;

    const imagePart = currentGallery[currentImageIndex];
    fullscreenImage.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
    
    // Update button states
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

  const copyImageToClipboard = async () => {
      if (currentGallery.length === 0 || currentImageIndex < 0) return;
      
      const imagePart = currentGallery[currentImageIndex];
      try {
          // Convert image to PNG Blob for clipboard compatibility (fixes JPEG issues in some browsers)
          const img = new Image();
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
          });

          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          
          ctx.drawImage(img, 0, 0);
          
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Failed to create PNG blob');

          await navigator.clipboard.write([
              new ClipboardItem({
                  'image/png': blob
              })
          ]);
          
          // Visual feedback
          if (copyImageBtn) {
              const originalHtml = copyImageBtn.innerHTML;
              copyImageBtn.innerHTML = '<span style="font-size: 1.2rem;">✓</span>';
              setTimeout(() => {
                  copyImageBtn.innerHTML = originalHtml;
              }, 2000);
          }
      } catch (err) {
          console.error('Failed to copy image: ', err);
          alert('Failed to copy image to clipboard. ' + err);
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
            
            // Add file to zip from base64 data
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

    // Reset button state after download
    updateDownloadButtonState();
  };

  const openGalleryModal = () => {
    if (!galleryModal || !galleryGrid) return;
    
    galleryGrid.innerHTML = ''; // Clear previous content
    selectedHistoryIndices.clear(); // Reset selection
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
                e.stopPropagation(); // Prevent selection toggle when clicking view
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

    // Show only the most recent items in the side panel.
    // Iterate backwards to ensure newest items are first and indices are correct.
    const displayCount = 10;
    const startIndex = Math.max(0, history.length - displayCount);
    
    for (let i = history.length - 1; i >= startIndex; i--) {
        const imagePart = history[i];
        const originalIndex = i; // This is the guaranteed correct index

        const historyItem = document.createElement('button');
        historyItem.className = 'history-item';
        historyItem.setAttribute('aria-label', 'View this image fullscreen or drag to canvas');
        historyItem.onclick = () => openModal(history, originalIndex);

        // Make the button itself draggable to ensure the event fires reliably.
        historyItem.draggable = true;
        historyItem.addEventListener('dragstart', (e) => {
            try {
                // Ensure dataTransfer exists before using it
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
        // Prevent the image's default drag behavior from interfering with the button's.
        img.draggable = false; 

        historyItem.appendChild(img);
        historyGallery.appendChild(historyItem);
    }
  }

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
    const uploadLabel = appContainer?.querySelector<HTMLSpanElement>('#reference-upload-label span');
    if (!uploadLabel) return;
    if (currentMode === 'lighting') {
        uploadLabel.textContent = 'Добавьте референс для освещения (необязательно)';
    } else {
        uploadLabel.textContent = 'Добавьте референсные изображения (необязательно)';
    }
  };

  const updatePromptPlaceholder = () => {
    if (!promptInput) return;
    if (currentMode === 'free') {
        promptInput.placeholder = 'Опишите изображение которое вы хотите сгенерировать'; // Russian text
    } else if (currentMode === 'analyze') {
        promptInput.placeholder = 'Что вы хотите узнать об этом изображении?'; // New placeholder for analyze mode
    } else if (currentMode === 'lighting') {
        promptInput.placeholder = 'Опишите желаемое освещение или используйте пресет...';
    } else {
        promptInput.placeholder = defaultPromptPlaceholder || 'Describe your desired changes...'; // Fallback
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
        generateBtn.textContent = 'Generate'; // Reset to default text for other modes
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

    // Magic Enhance Button state
    if (magicEnhanceBtn) {
        // Enable only if there is text to enhance
        magicEnhanceBtn.disabled = !isPromptFilled;
        if (currentMode === 'analyze') {
             magicEnhanceBtn.disabled = true; // Enhance prompt doesn't make sense for questions
             magicEnhanceBtn.classList.add('hidden');
        } else {
             magicEnhanceBtn.classList.remove('hidden');
        }
    }

  };

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
                temperature: 0, // We want a deterministic analysis
            }
        });

        const tempStr = response.text.trim();
        let tempNum = parseInt(tempStr, 10);

        if (!isNaN(tempNum)) {
            // Clamp the value to be within our slider's range
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
  
  const enhancePrompt = async () => {
      if (!promptInput || !promptInput.value.trim() || !magicEnhanceBtn) return;

      const originalText = promptInput.value;
      magicEnhanceBtn.disabled = true;
      const originalIcon = magicEnhanceBtn.innerHTML;
      magicEnhanceBtn.innerHTML = '...';

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { text: `Expand the following image generation prompt to be more descriptive, artistic, and detailed, suitable for a high-quality image generation model. Keep it under 100 words. Preserve the original intent. Prompt: "${originalText}"` }
                  ]
              },
              config: {
                  temperature: 0.7,
              }
          });

          const enhancedText = response.text.trim();
          if (enhancedText) {
              promptInput.value = enhancedText;
              updateButtonState();
          }
      } catch (error) {
          console.error("Error enhancing prompt:", error);
      } finally {
          magicEnhanceBtn.innerHTML = originalIcon;
          updateButtonState(); // Re-evaluate disable state
      }
  };

  const hideComparisonView = () => {
    if (comparisonAfterContainer && comparisonSliderHandle && toggleComparisonBtn) {
        isComparisonActive = false;
        comparisonAfterContainer.classList.add('hidden');
        comparisonSliderHandle.classList.add('hidden');
        toggleComparisonBtn.classList.remove('active');
        if (comparisonAfterImage) comparisonAfterImage.src = ''; // Clear image
    }
  };

  const clearMask = () => {
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      }
    }
    maskHistory = [];
  };

  const clearLightMarkers = () => {
    lightMarkers = [];
    if (lightingOverlayCanvas) {
      const ctx = lightingOverlayCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, lightingOverlayCanvas.width, lightingOverlayCanvas.height);
      }
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
      clearMask();
      clearLightMarkers();
      hideComparisonView();
      updateButtonState();
      updateMainUploadLabel();
      
      if (clearMainImageBtn) {
          clearMainImageBtn.classList.remove('hidden');
      }

      // If in lighting mode, analyze the image
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

    // Add a label for the reference images
    const label = document.createElement('span');
    label.id = 'reference-image-label';
    label.textContent = 'Reference Images:';
    referencePreviewContainer.appendChild(label);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'reference-grid'; // New class for grid layout
    
    referenceImages.forEach(newRefImage => {
        // Create preview element
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
            renderReferenceImages(); // Re-render to update the display
            updateButtonState(); // Update button state if needed
        };

        thumbContainer.appendChild(img);
        thumbContainer.appendChild(removeBtn);
        gridContainer.appendChild(thumbContainer);
    });
    referencePreviewContainer.appendChild(gridContainer);
    referencePreviewContainer.classList.remove('hidden');
  };

  const processMainImageFile = async (file: File | null) => {
    if (!file || (file.type && !file.type.startsWith('image/'))) {
        uploadedImage = null;
        if (imagePreview) imagePreview.classList.add('hidden');
        if (imagePreviewContainer) imagePreviewContainer.classList.remove('has-image');
        if (clearMainImageBtn) clearMainImageBtn.classList.add('hidden');
        if (imageUploadInput) imageUploadInput.value = ''; // Reset input value
        
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

    // Filter for image files
    const newImageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    // Clear existing reference images if you want to replace, or append if you want to add.
    // For now, let's append to existing references.
    for (const file of newImageFiles) {
        const imagePart = await fileToImagePart(file);
        referenceImages.push({ ...imagePart, id: Date.now() + Math.random() });
    }
    
    renderReferenceImages(); // Update the display of reference images
    updateButtonState();
  };

  const handleImageUploadEvent = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        processMainImageFile(files[0]); // Only take the first file for the main image
    }
  };

  const handleReferenceUploadEvent = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
        processReferenceFiles(files);
        // Clear the input value so the same file can be uploaded again if needed
        target.value = ''; 
    }
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement): boolean => {
    if (canvas.width === 0 || canvas.height === 0) return true; // Fix: Prevent error on 0-sized canvas
    return !canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
  }
  
  /**
   * Resizes a reference image to match the main image's aspect ratio via letterboxing.
   * This prevents the model from changing the output image's aspect ratio.
   */
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

              // Fill background with a neutral color
              ctx.fillStyle = '#808080'; // Mid-gray
              ctx.fillRect(0, 0, targetWidth, targetHeight);

              const scale = Math.min(targetWidth / refImg.naturalWidth, targetHeight / refImg.naturalHeight);
              const newWidth = refImg.naturalWidth * scale;
              const newHeight = refImg.naturalHeight * scale;
              const x = (targetWidth - newWidth) / 2;
              const y = (targetHeight - newHeight) / 2;

              ctx.drawImage(refImg, x, y, newWidth, newHeight);

              // Use PNG to avoid quality loss from re-compression
              const dataUrl = canvas.toDataURL('image/png');
              const mimeType = 'image/png';
              const data = dataUrl.substring(dataUrl.indexOf(',') + 1);
              
              resolve({ mimeType, data });
          };
          refImg.onerror = reject;
          refImg.src = `data:${refImagePart.mimeType};base64,${refImagePart.data}`;
      });
  };

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

    // Yield to the event loop to allow the UI to update with the "Generating..." message
    await new Promise(resolve => setTimeout(resolve, 20));

    try {
      resultImages = []; // Clear previous results
      let currentModelName: string;
      let generationAPI: 'generateContent' | 'generateImages';
      let apiRequestPayload: any;
      let isTextOutputMode = false; // Flag to check if the mode is for text output

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
              // ... lighting marker logic ...
              const { width, height } = lightingOverlayCanvas;
              const colorValue = lightColorPicker?.value || '#FFFFFF';
              // ... (marker conversion logic remains same) ...
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
              // No light markers, use sliders and text input
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
          // Add all reference images
          const referenceImagePartsForAnalyze = referenceImages.map(refImg => ({
              inlineData: { data: refImg.data, mimeType: refImg.mimeType }
          }));
          allPartsForAnalyze.push(...referenceImagePartsForAnalyze);
          allPartsForAnalyze.push({ text: finalPrompt }); // Prompt always last

          apiRequestPayload = {
              model: currentModelName,
              contents: { parts: allPartsForAnalyze },
              config: {
                  responseModalities: [Modality.TEXT], // Expecting text output
                  temperature: temperature,
              },
          };
      }
      else if (currentMode === 'free') {
          // Free mode (Generation). We explicitly ignore 'uploadedImage' (main image) here
          // because in this mode the UI hides the main image input, implying the user
          // wants to generate from scratch or from references only.
          
          if (referenceImages.length > 0) {
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
              // Imagen 3
              currentModelName = 'imagen-4.0-generate-001';
              generationAPI = 'generateImages';
              apiRequestPayload = {
                  model: currentModelName,
                  prompt: finalPrompt,
                  config: {
                      numberOfImages: generationCount, // Imagen handles count internally
                      outputMimeType: 'image/jpeg',
                      aspectRatio: selectedAspectRatio,
                  },
              };
          }
      } else {
          // Gemini Image Editing
          currentModelName = 'gemini-2.5-flash-image';
          generationAPI = 'generateContent';
          const allParts: (object)[] = [];

          if (uploadedImage) {
              allParts.push({
                  inlineData: { data: uploadedImage.data, mimeType: uploadedImage.mimeType },
              });
          }
          
          if (currentMode === 'inpaint' && maskCanvas && imagePreview && !isCanvasBlank(maskCanvas) && uploadedImage) {
             // ... Mask logic ...
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
              }
          }
          
          if (currentMode !== 'inpaint' && referenceImages.length > 0 && uploadedImage) {
              // ... Reference resize logic ...
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
              const generationPromises = Array(needed).fill(null).map(() => {
                  return ai.models.generateContent(apiRequestPayload).then(response => ({ response }));
              });
              
              attempts += needed;
              const results = await Promise.allSettled(generationPromises);
              
              for (const result of results) {
                  if (result.status === 'fulfilled') {
                      const { response } = result.value;
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
              const imgRequestPayload = { 
                  ...apiRequestPayload, 
                  config: { 
                      ...apiRequestPayload.config, 
                      numberOfImages: needed,
                  } 
              };
              
              attempts += needed; 

              try {
                  const response = await ai.models.generateImages(imgRequestPayload);
                  if (response.generatedImages && response.generatedImages.length > 0) {
                      for (const genImage of response.generatedImages) {
                          if (genImage.image?.imageBytes) {
                              if (resultImages.length < activeGenCount) {
                                  resultImages.push({
                                      mimeType: 'image/jpeg',
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

      // After retries, render what we have.
      if (resultImages.length > 0) {
        imageGallery.innerHTML = ''; // Clear final loading message.
        
        if (currentMode === 'lighting' && uploadedImage && comparisonAfterImage) {
            // Use the first generated image for the initial comparison view
            const newImagePart = resultImages[0];
            comparisonAfterImage.src = `data:${newImagePart.mimeType};base64,${newImagePart.data}`;
            
            // Enable the comparison button
            if (toggleComparisonBtn) {
                toggleComparisonBtn.disabled = false;
            }
        }
        
        resultImages.forEach((imagePart, index) => {
            const galleryButton = document.createElement('button');
            galleryButton.className = 'gallery-item';
            galleryButton.setAttribute('aria-label', 'View this image fullscreen');
            
            galleryButton.onclick = () => {
                // If in lighting mode, update the 'after' image for comparison
                if (currentMode === 'lighting' && comparisonAfterImage && toggleComparisonBtn) {
                    const clickedImage = resultImages[index];
                    comparisonAfterImage.src = `data:${clickedImage.mimeType};base64,${clickedImage.data}`;
                    toggleComparisonBtn.disabled = false; // Ensure button is enabled
                }
                // Always open the modal for a fullscreen view
                openModal(resultImages, index);
            };

            const img = document.createElement('img');
            img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
            img.alt = prompt;

            galleryButton.appendChild(img);
            imageGallery.appendChild(galleryButton);
        });
        
        // If we couldn't generate all images, inform the user.
        if (resultImages.length < activeGenCount) {
            const warningEl = document.createElement('p');
            warningEl.textContent = `Could only generate ${resultImages.length} of the requested ${activeGenCount} images.`;
            warningEl.className = 'error';
            imageGallery.appendChild(warningEl);
        }

        // --- History Management ---
        // Only add images to history, not text analysis results
        if (!isTextOutputMode) {
            history.push(...resultImages);
            if (history.length > MAX_HISTORY_SIZE) {
                history.splice(0, history.length - MAX_HISTORY_SIZE);
            }
            renderHistory();
        }

      } else if (!isTextOutputMode) { // This block runs if resultImages is still empty after all retries and it's not a text output mode.
        setGalleryMessage('The model did not return any images after multiple retries. Please try a different prompt or check your connection.', true);
      } else if (isTextOutputMode && imageGallery.innerHTML === '') { // If analyze mode and no text was set
        setGalleryMessage('The model did not return any analysis text. Please try again.', true, true);
      }
    } catch (error) {
      console.error('Error generating image/text:', error);
      setGalleryMessage('An error occurred. Please check the console for details.', true);
    } finally {
      if (promptInput && currentMode === 'lighting') {
          promptInput.value = ''; // Clear prompt after lighting generation
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
}