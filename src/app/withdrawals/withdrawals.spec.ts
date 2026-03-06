import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Withdrawals } from './withdrawals';

describe('Withdrawals', () => {
  let component: Withdrawals;
  let fixture: ComponentFixture<Withdrawals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Withdrawals],
    }).compileComponents();

    fixture = TestBed.createComponent(Withdrawals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
