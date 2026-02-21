import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticeRunnerComponent } from './practice-runner.component';

describe('PracticeRunnerComponent', () => {
  let component: PracticeRunnerComponent;
  let fixture: ComponentFixture<PracticeRunnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeRunnerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PracticeRunnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
