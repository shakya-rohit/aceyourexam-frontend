import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UiStateService {
  private testModeSubject = new BehaviorSubject<boolean>(false);

  enterTestMode() {
    this.testModeSubject.next(true);
  }

  exitTestMode() {
    this.testModeSubject.next(false);
  }
}
