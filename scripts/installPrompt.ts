// PWA Install Prompt Handler
let deferredPrompt: any = null;

// Listen for beforeinstallprompt event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

function isInstalled(): boolean {
  return localStorage.getItem('dd_pwa_installed') === '1';
}

function isSnoozed(): boolean {
  const snoozeUntil = localStorage.getItem('dd_pwa_snooze_until');
  if (!snoozeUntil) return false;
  return new Date().getTime() < parseInt(snoozeUntil);
}

export function shouldShowToast(): boolean {
  if (typeof window === 'undefined') return false;
  return isMobile() && !isStandalone() && !isInstalled() && !isSnoozed();
}

export function triggerInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!deferredPrompt) {
      // iOS case - show manual instructions
      showIOSInstructions();
      resolve(false);
      return;
    }

    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        localStorage.setItem('dd_pwa_installed', '1');
        resolve(true);
      } else {
        resolve(false);
      }
      deferredPrompt = null;
    });
  });
}

function showIOSInstructions(): void {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8); z-index: 10001;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  `;
  
  modal.innerHTML = `
    <div style="background: white; padding: 24px; border-radius: 12px; max-width: 300px; text-align: center;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px;">Install Dine Deals</h3>
      <p style="margin: 0 0 16px 0; color: #666;">Tap the Share button, then "Add to Home Screen"</p>
      <button onclick="this.closest('div').parentElement.remove()" 
              style="background: #007AFF; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
        Got it
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function snoozeToast(): void {
  const snoozeUntil = new Date().getTime() + (14 * 24 * 60 * 60 * 1000); // 14 days
  localStorage.setItem('dd_pwa_snooze_until', snoozeUntil.toString());
}

export function showInstallToast(): void {
  if (!shouldShowToast()) return;
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; right: 20px;
    background: white; border-radius: 12px; padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); z-index: 10000;
    font-family: system-ui; border: 1px solid #e5e5e5;
  `;
  
  toast.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
      <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.4; flex: 1;">
        Install Dine Deals to your home screen for faster access.
      </p>
      <button onclick="this.closest('div').parentElement.remove(); (${snoozeToast.toString()})()" 
              style="background: none; border: none; font-size: 18px; color: #999; cursor: pointer; margin-left: 8px;">
        ×
      </button>
    </div>
    <div style="display: flex; gap: 12px;">
      <button id="install-btn" style="background: #007AFF; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">
        Install
      </button>
      <button onclick="this.closest('div').parentElement.remove(); (${snoozeToast.toString()})()" 
              style="background: #f5f5f5; color: #333; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-size: 14px;">
        Not Now
      </button>
    </div>
  `;
  
  toast.querySelector('#install-btn')?.addEventListener('click', () => {
    triggerInstall().then(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
  });
  
  document.body.appendChild(toast);
}