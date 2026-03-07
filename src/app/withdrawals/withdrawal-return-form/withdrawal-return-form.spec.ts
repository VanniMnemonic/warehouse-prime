import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WithdrawalReturnForm } from './withdrawal-return-form';

describe('WithdrawalReturnForm', () => {
  let component: WithdrawalReturnForm;
  let fixture: ComponentFixture<WithdrawalReturnForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WithdrawalReturnForm],
    }).compileComponents();

    fixture = TestBed.createComponent(WithdrawalReturnForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
