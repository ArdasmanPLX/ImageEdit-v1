/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Modality } from '@google/genai';
import JSZip from 'jszip';

type ImagePart = { mimeType: string; data: string; };
type ReferenceImage = ImagePart & { id: number; };

// Use a CSS selector to tell the extension which element to use for the image editor
const appContainer = document.querySelector('.app-container');

if (appContainer) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Get DOM elements
  const imageUploadInput = appContainer.querySelector<HTMLInputElement>('#image-upload');
  const imagePreview = appContainer.querySelector<HTMLImageElement>('#image-preview');
  const promptInput = appContainer.querySelector<HTMLTextAreaElement>('#prompt-input');
  const negativePromptInput = appContainer.querySelector<HTMLTextAreaElement>('#negative-prompt-input');
  const creativitySlider = appContainer.querySelector<HTMLInputElement>('#creativity-slider');
  const creativityValue = appContainer.querySelector<HTMLSpanElement>('#creativity-value');
  const generateBtn = appContainer.querySelector<HTMLButtonElement>('#generate-btn');
  const imageGallery = appContainer.querySelector<HTMLDivElement>('#image-gallery');
  const imagePreviewContainer = appContainer.querySelector<HTMLDivElement>('#image-preview-container');
  const referenceUploadInput = appContainer.querySelector<HTMLInputElement>('#reference-upload');
  const referencePreviewContainer = appContainer.querySelector<HTMLDivElement>('#reference-preview-container');
  const historyGallery = appContainer.querySelector<HTMLDivElement>('#history-gallery');
  const numButtons = appContainer.querySelectorAll<HTMLButtonElement>('.num-btn');
  const modeTabs = appContainer.querySelector<HTMLDivElement>('#mode-tabs');
  const presetButtonsContainer = appContainer.querySelector<HTMLDivElement>('#preset-buttons');
  const match3PresetButtonsContainer = appContainer.querySelector<HTMLDivElement>('#match3-preset-buttons');
  const resultContainer = appContainer.querySelector<HTMLDivElement>('#result-container');

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
  
  // Gallery Modal elements
  const galleryModal = document.querySelector<HTMLDivElement>('#gallery-modal');
  const closeGalleryBtn = document.querySelector<HTMLButtonElement>('#close-gallery-btn');
  const galleryGrid = document.querySelector<HTMLDivElement>('#gallery-grid');
  const galleryBtn = document.querySelector<HTMLButtonElement>('#gallery-btn');
  const filenamePrefixInput = document.querySelector<HTMLInputElement>('#filename-prefix');
  const downloadSelectedBtn = document.querySelector<HTMLButtonElement>('#download-selected-btn');


  let uploadedImage: ImagePart | null = null;
  let referenceImages: ReferenceImage[] = [];
  let history: ImagePart[] = [];
  let resultImages: ImagePart[] = [];
  let generationCount = 1;
  let currentMode = 'character';

  // Inpainting state
  let maskCtx: CanvasRenderingContext2D | null = null;
  let isDrawing = false;
  let isErasing = false;
  let maskHistory: ImageData[] = [];
  let lastX = 0;
  let lastY = 0;

  // State for fullscreen navigation
  let currentGallery: ImagePart[] = [];
  let currentImageIndex = -1;
  // State for gallery selection
  let selectedHistoryIndices = new Set<number>();
  
  const MAX_HISTORY_SIZE = 20; // Limit history to prevent UI clutter

  const setGalleryMessage = (message: string, isError = false) => {
    if (imageGallery) {
      imageGallery.innerHTML = '';
      const messageEl = document.createElement('p');
      messageEl.textContent = message;
      messageEl.className = isError ? 'error' : 'placeholder';
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

  const updateButtonState = () => {
    const isImageLoaded = !!uploadedImage;
    const isPromptFilled = !!promptInput?.value.trim();

    if (generateBtn) {
      generateBtn.disabled = !isImageLoaded || !isPromptFilled;
    }
    
    const allPresetButtons = appContainer.querySelectorAll<HTMLButtonElement>('.preset-btn');
    allPresetButtons.forEach(btn => {
        btn.disabled = !isImageLoaded;
    });
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

  const displayUploadedImage = (imagePart: ImagePart) => {
    if (imagePreview && imagePreviewContainer) {
      uploadedImage = imagePart;
      
      imagePreview.onload = () => {
        imagePreviewContainer.style.aspectRatio = `${imagePreview.naturalWidth} / ${imagePreview.naturalHeight}`;
        // The ResizeObserver will handle the canvas resize
      };

      imagePreview.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
      imagePreview.classList.remove('hidden');
      clearMask();
      updateButtonState();
    }
  };

  const processUploadedFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setGalleryMessage('Please upload an image file.', true);
        return;
    }
    const imagePart = await fileToImagePart(file);
    displayUploadedImage(imagePart);
  };

  const handleImageUploadEvent = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleReferenceUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || !referencePreviewContainer) return;
    
    // Clear previous reference images
    referenceImages = [];
    referencePreviewContainer.innerHTML = '';

    for (const file of Array.from(files)) {
        const imagePart = await fileToImagePart(file);
        const newRefImage: ReferenceImage = {
            ...imagePart,
            id: Date.now() + Math.random() // Unique ID for removal
        };
        referenceImages.push(newRefImage);

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
            thumbContainer.remove();
        };

        thumbContainer.appendChild(img);
        thumbContainer.appendChild(removeBtn);
        referencePreviewContainer.appendChild(thumbContainer);
    }
  }

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
    if (!uploadedImage || !promptInput?.value.trim() || !generateBtn || !imageGallery) {
      return;
    }

    const prompt = promptInput.value.trim();
    const negativePrompt = negativePromptInput?.value.trim() || '';
    const temperature = creativitySlider ? parseFloat(creativitySlider.value) : 0.9;

    let fullPrompt = prompt;
    if (negativePrompt) {
        fullPrompt += `. Avoid the following: ${negativePrompt}`;
    }

    generateBtn.disabled = true;
    resultContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setGalleryMessage(`Generating ${generationCount} image(s)...`);

    // Yield to the event loop to allow the UI to update with the "Generating..." message
    await new Promise(resolve => setTimeout(resolve, 20));

    try {
      const allParts: (object)[] = [];

      // 1. Add the main image
      allParts.push({
        inlineData: {
          data: uploadedImage.data,
          mimeType: uploadedImage.mimeType,
        },
      });
      
      // 2. Add mask if in inpaint mode and canvas is not blank
      if (currentMode === 'inpaint' && maskCanvas && imagePreview && !isCanvasBlank(maskCanvas)) {
        const originalWidth = imagePreview.naturalWidth;
        const originalHeight = imagePreview.naturalHeight;
    
        if (originalWidth > 0 && originalHeight > 0) {
            // Get the drawn mask from the visible canvas
            const displayWidth = maskCanvas.width;
            const displayHeight = maskCanvas.height;
            const displayCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
            
            if (displayCtx) {
                // Create a black and white version of the mask at display resolution
                const drawnImageData = displayCtx.getImageData(0, 0, displayWidth, displayHeight);
                const bwMaskImageData = new ImageData(displayWidth, displayHeight);
                for (let i = 0; i < drawnImageData.data.length; i += 4) {
                    const alpha = drawnImageData.data[i + 3];
                    if (alpha > 0) { // If drawn on, make it white
                        bwMaskImageData.data[i] = 255; bwMaskImageData.data[i + 1] = 255; bwMaskImageData.data[i + 2] = 255; bwMaskImageData.data[i + 3] = 255;
                    } else { // Otherwise, make it black
                        bwMaskImageData.data[i] = 0; bwMaskImageData.data[i + 1] = 0; bwMaskImageData.data[i + 2] = 0; bwMaskImageData.data[i + 3] = 255;
                    }
                }
                
                // Put this B&W mask onto a temporary canvas to use as an image source
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = displayWidth;
                tempCanvas.height = displayHeight;
                tempCanvas.getContext('2d')?.putImageData(bwMaskImageData, 0, 0);
    
                // Create the final mask canvas at the original image's resolution
                const finalMaskCanvas = document.createElement('canvas');
                finalMaskCanvas.width = originalWidth;
                finalMaskCanvas.height = originalHeight;
                const finalMaskCtx = finalMaskCanvas.getContext('2d');
    
                if (finalMaskCtx) {
                    // Scale the B&W mask to fit the original image resolution.
                    finalMaskCtx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight);
    
                    // Get the base64 data from the final, scaled mask
                    const maskDataUrl = finalMaskCanvas.toDataURL('image/png');
                    const maskBase64 = maskDataUrl.substring(maskDataUrl.indexOf(',') + 1);
                    allParts.push({ inlineData: { mimeType: 'image/png', data: maskBase64 } });
                }
            }
        } else {
            console.warn("Could not determine original image dimensions. Mask will not be sent.");
        }
      }

      let promptForModel = fullPrompt;

      // 3. Add reference images, pre-processing them to match the main image's aspect ratio.
      if (currentMode !== 'inpaint' && referenceImages.length > 0) {
        // FIX: Declare the type of processedReferenceImages as ImagePart[] to accommodate the resized images
        // which do not have an 'id' property.
        let processedReferenceImages: ImagePart[] = referenceImages;
        try {
            // Get dimensions of the main uploaded image to use as the target for references
            const mainImageDimensions = await new Promise<{width: number, height: number}>((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                img.onerror = (err) => reject(new Error('Could not load main image to get dimensions'));
                img.src = `data:${uploadedImage.mimeType};base64,${uploadedImage.data}`;
            });

            if (mainImageDimensions.width > 0 && mainImageDimensions.height > 0) {
                // Pre-process reference images to match the main image's aspect ratio via letterboxing
                const resizePromises = referenceImages.map(refImg => 
                    resizeRefToMatchAspectRatio(refImg, mainImageDimensions.width, mainImageDimensions.height)
                );
                processedReferenceImages = await Promise.all(resizePromises);
            }
        } catch (resizeError) {
            console.error("Could not resize reference images, sending originals as a fallback.", resizeError);
            // If resizing fails, we'll use the original images. The prompt will be our only defense.
            processedReferenceImages = referenceImages;
        }

        const referenceImageParts = processedReferenceImages.map(refImg => ({
            inlineData: {
                data: refImg.data,
                mimeType: refImg.mimeType, // Will be 'image/png' after resizing
            }
        }));
        allParts.push(...referenceImageParts);
        
        // Add explicit instructions to the prompt for the model to preserve dimensions.
        promptForModel = `This is an image editing task with references. You are given a primary image to edit, and one or more reference images. **Do not edit the reference images.** Your task is to apply the requested edit to the primary image only, using the reference images for guidance. The primary image is the first one in the sequence. Preserve its aspect ratio. The user's request is: "${fullPrompt}"`;
      }

      // 4. Add the text prompt
      allParts.push({ text: promptForModel });

      const requestPayload = {
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: allParts,
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
          temperature: temperature,
        },
      };

      resultImages = []; // Clear previous results
      
      // Retry logic to ensure the requested number of images are generated.
      const MAX_TOTAL_ATTEMPTS = generationCount * 3; // For 6 images, try up to 18 times total.
      let attempts = 0;

      while(resultImages.length < generationCount && attempts < MAX_TOTAL_ATTEMPTS) {
        const needed = generationCount - resultImages.length;
        
        // Add a small delay between batches if there were failures in the previous one.
        if (attempts > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`Attempting to generate ${needed} more image(s)...`);

        const generationPromises = Array(needed).fill(null).map(() =>
            ai.models.generateContent(requestPayload)
        );
        
        attempts += needed;

        const results = await Promise.allSettled(generationPromises);

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const response = result.value;
                if (response.candidates && response.candidates.length > 0) {
                    // The model might return multiple parts (e.g., text commentary), find the image.
                    const imagePartFound = response.candidates[0].content.parts.find(part => part.inlineData);
                    if (imagePartFound && imagePartFound.inlineData) {
                        const imagePart: ImagePart = {
                            mimeType: imagePartFound.inlineData.mimeType,
                            data: imagePartFound.inlineData.data,
                        };
                        // Only add if we still need more images.
                        if (resultImages.length < generationCount) {
                           resultImages.push(imagePart);
                        }
                    } else {
                         console.warn('Successful response but no image data found.', response);
                    }
                } else {
                    console.warn('Received a successful response with no candidates:', response);
                }
            } else {
                console.error('A generation request failed:', result.reason);
            }
        }
        
        // Update the loading message with progress.
        setGalleryMessage(`Generating... ${resultImages.length} / ${generationCount} complete.`);
      }

      // After retries, render what we have.
      if (resultImages.length > 0) {
        imageGallery.innerHTML = ''; // Clear final loading message.
        resultImages.forEach((imagePart, index) => {
            const galleryButton = document.createElement('button');
            galleryButton.className = 'gallery-item';
            galleryButton.setAttribute('aria-label', 'View this image fullscreen');
            galleryButton.onclick = () => openModal(resultImages, index);
            
            const img = document.createElement('img');
            img.src = `data:${imagePart.mimeType};base64,${imagePart.data}`;
            img.alt = prompt;

            galleryButton.appendChild(img);
            imageGallery.appendChild(galleryButton);
        });
        
        // If we couldn't generate all images, inform the user.
        if (resultImages.length < generationCount) {
            const warningEl = document.createElement('p');
            warningEl.textContent = `Could only generate ${resultImages.length} of the requested ${generationCount} images.`;
            warningEl.className = 'error';
            imageGallery.appendChild(warningEl);
        }

        // --- History Management ---
        history.push(...resultImages);
        if (history.length > MAX_HISTORY_SIZE) {
            history.splice(0, history.length - MAX_HISTORY_SIZE);
        }
        renderHistory();

      } else {
        // This block runs if resultImages is still empty after all retries.
        setGalleryMessage('The model did not return any images after multiple retries. Please try a different prompt or check your connection.', true);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setGalleryMessage('An error occurred. Please check the console for details.', true);
    } finally {
      updateButtonState();
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
    
    // Check for a dropped history item first (as JSON for robustness)
    const historyItemJson = e.dataTransfer?.getData('application/json');
    if (historyItemJson) {
        try {
            const imagePart: ImagePart = JSON.parse(historyItemJson);
            // Basic validation
            if (imagePart && typeof imagePart.mimeType === 'string' && typeof imagePart.data === 'string') {
                displayUploadedImage(imagePart);
            }
        } catch (err) {
            console.error("Failed to parse dropped history item:", err);
        }
        return; // Stop further processing
    }

    // Fallback to file drop
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        await processUploadedFile(files[0]);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                processUploadedFile(file);
                // Stop after finding the first image
                event.preventDefault(); 
                break;
            }
        }
    }
  };

  // --- Inpainting canvas functions ---

  const updateBrushCursorSize = () => {
    if (brushCursor && brushSizeSlider) {
        const size = parseInt(brushSizeSlider.value, 10);
        brushCursor.style.width = `${size}px`;
        brushCursor.style.height = `${size}px`;
    }
  };

  const saveMaskState = () => {
    // Fix: Prevent error on 0-sized canvas
    if (maskCtx && maskCanvas && maskCanvas.width > 0 && maskCanvas.height > 0) {
        maskHistory.push(maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height));
    }
  };

  const undoLastMaskAction = () => {
    if (maskHistory.length > 1 && maskCtx) {
        maskHistory.pop(); // Remove current state
        maskCtx.putImageData(maskHistory[maskHistory.length - 1], 0, 0); // Restore previous
    } else if (maskHistory.length === 1) {
        // If only one state is left, it's the initial blank one, so just clear
        clearMask();
    }
  };

  const clearMask = () => {
    if (maskCtx && maskCanvas) {
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        maskHistory = [];
        saveMaskState(); // Save the initial blank state
    }
  }

  const getCoords = (e: MouseEvent | TouchEvent): {x: number, y: number} | null => {
    if (!maskCanvas) return null;
    const rect = maskCanvas.getBoundingClientRect();
    const event = 'touches' in e ? e.touches[0] : e;
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  const startDrawing = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const coords = getCoords(e);
    if (!maskCtx || !coords) return;
    
    saveMaskState(); // Save state before drawing starts

    isDrawing = true;
    [lastX, lastY] = [coords.x, coords.y];

    // Draw a single dot for clicks without dragging
    maskCtx.beginPath();
    maskCtx.arc(coords.x, coords.y, maskCtx.lineWidth / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const draw = (e: MouseEvent | TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoords(e);
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
        maskCtx?.beginPath(); // Reset the path
    }
  };

  const setupInpaintCanvas = () => {
    if (!maskCanvas || !imagePreview || !brushSizeSlider || !brushCursor) return;
    maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    maskCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    maskCtx.lineWidth = parseInt(brushSizeSlider.value, 10);
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    
    // Sync canvas size with image size
    const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            maskCanvas.width = width;
            maskCanvas.height = height;
            // Re-apply settings as they can be reset on resize
            if(maskCtx) {
                maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                maskCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                maskCtx.lineWidth = parseInt(brushSizeSlider.value, 10);
                maskCtx.lineCap = 'round';
                maskCtx.lineJoin = 'round';
            }
            clearMask(); // Clear mask on resize
        }
    });
    resizeObserver.observe(imagePreview);

    // Custom cursor logic
    updateBrushCursorSize();
    maskCanvas.addEventListener('mouseenter', () => brushCursor.classList.remove('hidden'));
    maskCanvas.addEventListener('mouseleave', () => brushCursor.classList.add('hidden'));
    maskCanvas.addEventListener('mousemove', (e) => {
        brushCursor.style.left = `${e.clientX}px`;
        brushCursor.style.top = `${e.clientY}px`;
        draw(e);
    });

    // Drawing Listeners
    maskCanvas.addEventListener('mousedown', startDrawing);
    maskCanvas.addEventListener('mouseup', stopDrawing);
    maskCanvas.addEventListener('mouseout', stopDrawing);
    maskCanvas.addEventListener('touchstart', startDrawing, { passive: false });
    maskCanvas.addEventListener('touchmove', draw, { passive: false });
    maskCanvas.addEventListener('touchend', stopDrawing);

    saveMaskState(); // Save initial blank state
  };


  // Initial state and event listeners
  if (imageUploadInput && promptInput && generateBtn && imagePreviewContainer && referenceUploadInput && modeTabs && presetButtonsContainer && resultContainer) {
    imageUploadInput.addEventListener('change', handleImageUploadEvent);
    referenceUploadInput.addEventListener('change', handleReferenceUpload);
    promptInput.addEventListener('input', updateButtonState);
    generateBtn.addEventListener('click', handleGenerateClick);
    
    // Creativity slider listener
    if (creativitySlider && creativityValue) {
        creativitySlider.addEventListener('input', () => {
            creativityValue.textContent = creativitySlider.value;
        });
    }

    // Number of images selection
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

    // Allow clicking container to trigger file input
    imagePreviewContainer.addEventListener('click', () => {
        // Only trigger upload if not in inpaint mode
        if (currentMode !== 'inpaint') {
            imageUploadInput.click();
        }
    });
    imagePreviewContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
             if (currentMode !== 'inpaint') {
                imageUploadInput.click();
            }
        }
    });

    // Drag and Drop listeners
    imagePreviewContainer.addEventListener('dragover', handleDragOver);
    imagePreviewContainer.addEventListener('dragleave', handleDragLeave);
    imagePreviewContainer.addEventListener('drop', handleDrop);
    
    // Paste listener
    window.addEventListener('paste', handlePaste);

    // Mode Tabs logic
    modeTabs.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.matches('.tab-btn')) {
        const mode = target.dataset.mode || 'character';
        currentMode = mode;
        // Update button states
        modeTabs.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        });
        target.classList.add('active');
        target.setAttribute('aria-selected', 'true');

        // Show/hide relevant controls
        const isCharacter = mode === 'character';
        const isInpaint = mode === 'inpaint';
        const isMatch3 = mode === 'match3';
        presetButtonsContainer.classList.toggle('hidden', !isCharacter);
        match3PresetButtonsContainer?.classList.toggle('hidden', !isMatch3);
        inpaintControls?.classList.toggle('hidden', !isInpaint);
        imagePreviewContainer.classList.toggle('inpaint-active', isInpaint);

        if (!isInpaint && brushCursor) {
            brushCursor.classList.add('hidden');
        }
      }
    });

    // Inpaint Controls Listeners
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

    // A helper function to set up preset buttons to avoid repetition
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
    
    // Preset button listeners
    setupPresetButton('preset-turn-side', 'Поверни персонажа - вид сбоку');
    setupPresetButton('preset-turn-34', 'Поверни персонажа - вид в 3/4');
    setupPresetButton('preset-turn-back', 'Поверни персонажа - вид со спины');
    setupPresetButton('preset-turn-front', 'Поверни персонажа - вид анфас');
    setupPresetButton('preset-emotion-ref', 'Измени эмоцию персонажа');
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
    
    // Single Image Modal listeners
    if (fullscreenModal && closeModalBtn && prevImageBtn && nextImageBtn) {
        closeModalBtn.addEventListener('click', closeModal);
        prevImageBtn.addEventListener('click', showPrevImage);
        nextImageBtn.addEventListener('click', showNextImage);

        fullscreenModal.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) {
                closeModal();
            }
        });
    }

    // Gallery Modal Listeners
    if (galleryModal && closeGalleryBtn && galleryBtn && downloadSelectedBtn) {
      galleryBtn.addEventListener('click', openGalleryModal);
      closeGalleryBtn.addEventListener('click', closeGalleryModal);
      downloadSelectedBtn.addEventListener('click', handleDownloadSelected);
      galleryModal.addEventListener('click', (e) => {
          // Close if clicking on the backdrop, not the content
          if (e.target === galleryModal) {
              closeGalleryModal();
          }
      });
    }

    // Global keydown listener for all modals
    window.addEventListener('keydown', (e) => {
        // If single image view is open, its controls take priority
        if (fullscreenModal && !fullscreenModal.classList.contains('modal-hidden')) {
             if (e.key === 'Escape') closeModal();
             if (e.key === 'ArrowLeft') showPrevImage();
             if (e.key === 'ArrowRight') showNextImage();
             return; // Stop further processing
        }
        
        // Else, if gallery is open, handle its close event
        if (galleryModal && !galleryModal.classList.contains('modal-hidden')) {
            if (e.key === 'Escape') closeGalleryModal();
        }
    });

    setupInpaintCanvas();
    setGalleryMessage('Your generated image will appear here.');
    renderHistory();
    updateButtonState();
  }
}