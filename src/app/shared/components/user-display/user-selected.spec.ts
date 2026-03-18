import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { UserSelected } from './user-selected';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('UserSelected', () => {
  let component: UserSelected;
  let componentRef: ComponentRef<UserSelected>;
  let fixture: ComponentFixture<UserSelected>;

  const mockUser = {
    id: 1,
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice.johnson@example.com',
    role: 'Admin',
    image_path: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSelected, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSelected);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;
    componentRef.setInput('user', mockUser);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user full name', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Alice');
    expect(text).toContain('Johnson');
  });

  it('should display user email', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('alice.johnson@example.com');
  });

  it('should emit onClear when clear button is clicked', () => {
    fixture.detectChanges();
    let emitted = false;
    component.onClear.subscribe(() => (emitted = true));
    const btn = fixture.nativeElement.querySelector('p-button');
    btn.click();
    expect(emitted).toBeTrue();
  });
});
