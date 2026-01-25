import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private loading = signal(false);
  private hiding = signal(false);

  isLoading() {
    return this.loading();
  }

  isHiding() {
    return this.hiding();
  }

  show() {
    this.hiding.set(false);
    this.loading.set(true);
  }

  hide() {
    this.hiding.set(true);
    setTimeout(() => {
      this.loading.set(false);
      this.hiding.set(false);
    }, 600);
  }
}
