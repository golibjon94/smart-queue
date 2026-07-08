import { Injectable, signal } from '@angular/core';

/** Layout-darajali UI holati (sidebar yig'ilgan/ochiq). */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarCollapsed = signal(false);
  readonly sidebarCollapsed = this._sidebarCollapsed.asReadonly();

  toggleSidebar(): void {
    this._sidebarCollapsed.update((v) => !v);
  }
}
