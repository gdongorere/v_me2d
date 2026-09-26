import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private _notification$ = new BehaviorSubject<Notification | null>(null);

  get notification$(): Observable<Notification | null> {
    return this._notification$.asObservable();
  }

  showSuccess(message: string) {
    this.show(message, 'success');
  }

  showError(message: string) {
    this.show(message, 'error');
  }

  showInfo(message: string) {
    this.show(message, 'info');
  }

  private show(message: string, type: 'success' | 'error' | 'info') {
    this._notification$.next({ message, type });
    setTimeout(() => {
      this._notification$.next(null);
    }, 3000);
  }
}
