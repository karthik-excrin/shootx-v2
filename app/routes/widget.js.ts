import { LoaderFunctionArgs } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shopParam = url.searchParams.get('shop');
  
  if (!shopParam) {
    return new Response('Shop parameter is required', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const shop = await prisma.shop.findUnique({
    where: { shopDomain: shopParam },
  });

  if (!shop || !shop.tryOnEnabled) {
    return new Response('// Try-on widget disabled', {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  const widgetScript = `
(function() {
  'use strict';
  
  const SHOP_CONFIG = {
    shopDomain: '${shop.shopDomain}',
    buttonText: '${shop.buttonText}',
    buttonColor: '${shop.buttonColor}',
    popupTitle: '${shop.popupTitle}',
    maxFileSize: ${shop.maxFileSize},
    allowedFileTypes: '${shop.allowedFileTypes}'.split(','),
  };

  // Create and inject CSS
  function injectCSS() {
    const css = \`
      .shootx-try-on-btn {
        background-color: \${SHOP_CONFIG.buttonColor} !important;
        color: white !important;
        border: none !important;
        padding: 12px 24px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        margin: 10px 0 !important;
        transition: opacity 0.2s ease !important;
        display: inline-block !important;
        text-decoration: none !important;
      }
      
      .shootx-try-on-btn:hover {
        opacity: 0.9 !important;
      }
      
      .shootx-popup-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.8) !important;
        z-index: 10000 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
      }
      
      .shootx-popup {
        background: white !important;
        border-radius: 12px !important;
        max-width: 500px !important;
        width: 100% !important;
        max-height: 90vh !important;
        overflow-y: auto !important;
        position: relative !important;
      }
      
      .shootx-popup-header {
        padding: 24px 24px 0 24px !important;
        border-bottom: 1px solid #e5e5e5 !important;
        margin-bottom: 24px !important;
      }
      
      .shootx-popup-title {
        font-size: 24px !important;
        font-weight: 700 !important;
        margin: 0 0 8px 0 !important;
        color: #333 !important;
      }
      
      .shootx-popup-subtitle {
        color: #666 !important;
        font-size: 14px !important;
        margin: 0 0 16px 0 !important;
      }
      
      .shootx-popup-content {
        padding: 0 24px 24px 24px !important;
      }
      
      .shootx-close-btn {
        position: absolute !important;
        top: 16px !important;
        right: 16px !important;
        background: none !important;
        border: none !important;
        font-size: 24px !important;
        cursor: pointer !important;
        color: #999 !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 6px !important;
      }
      
      .shootx-close-btn:hover {
        background: #f5f5f5 !important;
        color: #333 !important;
      }
      
      .shootx-upload-area {
        border: 2px dashed #ddd !important;
        border-radius: 8px !important;
        padding: 40px 20px !important;
        text-align: center !important;
        margin-bottom: 20px !important;
        cursor: pointer !important;
        transition: border-color 0.2s ease !important;
      }
      
      .shootx-upload-area:hover,
      .shootx-upload-area.dragover {
        border-color: \${SHOP_CONFIG.buttonColor} !important;
        background-color: #f8f9ff !important;
      }
      
      .shootx-upload-icon {
        font-size: 48px !important;
        color: #ccc !important;
        margin-bottom: 16px !important;
      }
      
      .shootx-upload-text {
        font-size: 16px !important;
        color: #333 !important;
        margin-bottom: 8px !important;
      }
      
      .shootx-upload-hint {
        font-size: 12px !important;
        color: #999 !important;
      }
      
      .shootx-image-preview {
        max-width: 100% !important;
        border-radius: 8px !important;
        margin-bottom: 16px !important;
      }
      
      .shootx-btn-primary {
        background-color: \${SHOP_CONFIG.buttonColor} !important;
        color: white !important;
        border: none !important;
        padding: 12px 24px !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        width: 100% !important;
        margin-top: 16px !important;
      }
      
      .shootx-btn-primary:disabled {
        opacity: 0.6 !important;
        cursor: not-allowed !important;
      }
      
      .shootx-progress {
        text-align: center !important;
        padding: 20px !important;
      }
      
      .shootx-spinner {
        border: 3px solid #f3f3f3 !important;
        border-top: 3px solid \${SHOP_CONFIG.buttonColor} !important;
        border-radius: 50% !important;
        width: 40px !important;
        height: 40px !important;
        animation: shootx-spin 1s linear infinite !important;
        margin: 0 auto 16px auto !important;
      }
      
      @keyframes shootx-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .shootx-result-image {
        max-width: 100% !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
      }
      
      @media (max-width: 768px) {
        .shootx-popup {
          margin: 10px !important;
          max-height: calc(100vh - 20px) !important;
        }
        
        .shootx-upload-area {
          padding: 20px 10px !important;
        }
      }
    \`;
    
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Get product information from the current page
  function getProductInfo() {
    const productJson = document.querySelector('script[type="application/ld+json"]');
    let productData = null;
    
    if (productJson) {
      try {
        const data = JSON.parse(productJson.textContent);
        if (data['@type'] === 'Product' || data.product) {
          productData = data.product || data;
        }
      } catch (e) {
        console.warn('Failed to parse product JSON:', e);
      }
    }
    
    // Fallback to Shopify meta tags and common selectors
    const productId = document.querySelector('meta[name="product-id"]')?.getAttribute('content') ||
                     document.querySelector('[data-product-id]')?.getAttribute('data-product-id') ||
                     window.ShopifyAnalytics?.meta?.product?.id?.toString();
    
    const productTitle = productData?.name ||
                        document.querySelector('h1')?.textContent?.trim() ||
                        document.title;
    
    const productImage = productData?.image ||
                        document.querySelector('img[data-product-image]')?.src ||
                        document.querySelector('.product__media img')?.src ||
                        document.querySelector('.product-single__photo img')?.src ||
                        document.querySelector('.featured-image img')?.src;
    
    return {
      id: productId,
      title: productTitle,
      image: productImage
    };
  }

  // Create the try-on button
  function createTryOnButton() {
    const btn = document.createElement('button');
    btn.className = 'shootx-try-on-btn';
    btn.textContent = SHOP_CONFIG.buttonText;
    btn.onclick = openTryOnPopup;
    return btn;
  }

  // Create and show the popup
  function openTryOnPopup() {
    const overlay = document.createElement('div');
    overlay.className = 'shootx-popup-overlay';
    
    const popup = document.createElement('div');
    popup.className = 'shootx-popup';
    
    const product = getProductInfo();
    
    popup.innerHTML = \`
      <button class="shootx-close-btn" onclick="this.closest('.shootx-popup-overlay').remove()">&times;</button>
      <div class="shootx-popup-header">
        <h2 class="shootx-popup-title">\${SHOP_CONFIG.popupTitle}</h2>
        <p class="shootx-popup-subtitle">Upload your photo to see how "\${product.title}" looks on you</p>
      </div>
      <div class="shootx-popup-content">
        <div class="shootx-upload-container">
          <div class="shootx-upload-area" onclick="document.getElementById('shootx-file-input').click()">
            <div class="shootx-upload-icon">📸</div>
            <div class="shootx-upload-text">Click to upload or drag & drop</div>
            <div class="shootx-upload-hint">Supported: JPEG, PNG, WebP (max \${Math.round(SHOP_CONFIG.maxFileSize / 1024 / 1024)}MB)</div>
            <input type="file" id="shootx-file-input" style="display: none" accept="\${SHOP_CONFIG.allowedFileTypes.join(',')}" />
          </div>
          <div id="shootx-preview-container" style="display: none;">
            <img id="shootx-image-preview" class="shootx-image-preview" />
            <button class="shootx-btn-primary" id="shootx-generate-btn" onclick="generateTryOn()">Generate Try-On</button>
          </div>
          <div id="shootx-processing" class="shootx-progress" style="display: none;">
            <div class="shootx-spinner"></div>
            <p>Generating your virtual try-on...</p>
            <p style="font-size: 12px; color: #666;">This may take 30-60 seconds</p>
          </div>
          <div id="shootx-result" style="display: none; text-align: center;">
            <img id="shootx-result-image" class="shootx-result-image" />
            <button class="shootx-btn-primary" onclick="startOver()">Try Another Photo</button>
          </div>
        </div>
      </div>
    \`;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Set up file upload handling
    setupFileUpload();
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Close on overlay click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  function setupFileUpload() {
    const fileInput = document.getElementById('shootx-file-input');
    const previewContainer = document.getElementById('shootx-preview-container');
    const imagePreview = document.getElementById('shootx-image-preview');
    
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file && validateFile(file)) {
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function setupDragAndDrop() {
    const uploadArea = document.querySelector('.shootx-upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
      uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      uploadArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
      uploadArea.classList.add('dragover');
    }
    
    function unhighlight(e) {
      uploadArea.classList.remove('dragover');
    }
    
    uploadArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
      const files = e.dataTransfer.files;
      const file = files[0];
      
      if (file && validateFile(file)) {
        const reader = new FileReader();
        reader.onload = function(e) {
          document.getElementById('shootx-image-preview').src = e.target.result;
          document.getElementById('shootx-preview-container').style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    }
  }

  function validateFile(file) {
    if (file.size > SHOP_CONFIG.maxFileSize) {
      alert('File size too large. Maximum size is ' + Math.round(SHOP_CONFIG.maxFileSize / 1024 / 1024) + 'MB');
      return false;
    }
    
    if (!SHOP_CONFIG.allowedFileTypes.includes(file.type)) {
      alert('File type not supported. Please use JPEG, PNG, or WebP format.');
      return false;
    }
    
    return true;
  }

  window.generateTryOn = async function() {
    const product = getProductInfo();
    const imagePreview = document.getElementById('shootx-image-preview');
    const processContainer = document.getElementById('shootx-processing');
    const previewContainer = document.getElementById('shootx-preview-container');
    
    if (!product.id || !product.image || !imagePreview.src) {
      alert('Missing required information for try-on generation');
      return;
    }
    
    previewContainer.style.display = 'none';
    processContainer.style.display = 'block';
    
    try {
      const formData = new FormData();
      formData.append('shop', SHOP_CONFIG.shopDomain);
      formData.append('productId', product.id);
      formData.append('productTitle', product.title);
      formData.append('productImage', product.image);
      formData.append('customerImage', imagePreview.src);
      
      const response = await fetch('/api/tryon', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        pollForResult(result.requestId);
      } else {
        throw new Error(result.error || 'Failed to start try-on generation');
      }
    } catch (error) {
      console.error('Try-on generation error:', error);
      alert('Failed to generate try-on. Please try again.');
      processContainer.style.display = 'none';
      previewContainer.style.display = 'block';
    }
  };

  async function pollForResult(requestId) {
    const maxAttempts = 60; // 2 minutes max
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(\`/api/tryon-status?requestId=\${requestId}\`);
        const status = await response.json();
        
        if (status.status === 'completed' && status.resultImage) {
          showResult(status.resultImage);
        } else if (status.status === 'failed') {
          throw new Error('Try-on generation failed');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          throw new Error('Try-on generation timed out');
        }
      } catch (error) {
        console.error('Status polling error:', error);
        alert('Failed to generate try-on. Please try again.');
        document.getElementById('shootx-processing').style.display = 'none';
        document.getElementById('shootx-preview-container').style.display = 'block';
      }
    };
    
    poll();
  }

  function showResult(resultImageUrl) {
    document.getElementById('shootx-processing').style.display = 'none';
    document.getElementById('shootx-result-image').src = resultImageUrl;
    document.getElementById('shootx-result').style.display = 'block';
  }

  window.startOver = function() {
    document.getElementById('shootx-result').style.display = 'none';
    document.getElementById('shootx-preview-container').style.display = 'none';
    document.getElementById('shootx-file-input').value = '';
  };

  // Initialize the widget
  function init() {
    // Inject CSS
    injectCSS();
    
    // Find suitable locations for the button
    const possibleSelectors = [
      '.product-form__buttons',
      '.product__buttons',
      '.product-single__add-to-cart',
      '.product-form__cart',
      '[data-add-to-cart-form]',
      '.shopify-payment-button__more-options',
      '.product-form__input',
    ];
    
    let buttonContainer = null;
    
    for (const selector of possibleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        buttonContainer = element.parentNode;
        break;
      }
    }
    
    // Fallback: try to find any form with add to cart
    if (!buttonContainer) {
      const addToCartBtn = document.querySelector('button[name="add"], input[name="add"], button[type="submit"]');
      if (addToCartBtn && addToCartBtn.form) {
        buttonContainer = addToCartBtn.parentNode;
      }
    }
    
    // Final fallback: append to body
    if (!buttonContainer) {
      buttonContainer = document.body;
    }
    
    // Create and insert the button
    const tryOnButton = createTryOnButton();
    buttonContainer.appendChild(tryOnButton);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

  return new Response(widgetScript, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
};