import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loading = signal(false);
  private hiding = signal(false);
  private customMessage = signal<string | null>(null);
  private autoHideTimeout: any = null;

  isLoading() {
    return this.loading();
  }

  isHiding() {
    return this.hiding();
  }

  getMessage() {
    return this.customMessage();
  }

  show(message?: string) {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
    if (message) {
      this.customMessage.set(message);
    } else {
      this.customMessage.set(null);
    }
    this.hiding.set(false);
    this.loading.set(true);

    // Safety auto-dismiss after 10s if network hangs
    this.autoHideTimeout = setTimeout(() => {
      if (this.loading()) {
        this.hide();
      }
    }, 10000);
  }

  hide() {
    if (this.autoHideTimeout) {
      clearTimeout(this.autoHideTimeout);
      this.autoHideTimeout = null;
    }
    this.hiding.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.hiding.set(false);
      this.customMessage.set(null);
    }, 450);
  }
}

