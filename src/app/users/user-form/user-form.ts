import { Component, inject, input, output, effect, signal, SecurityContext } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { UserService } from '../../services/user.service';
import { LocationService } from '../../services/location.service';
import { TitleService } from '../../services/title.service';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { TreeSelectModule } from 'primeng/treeselect';
import { TreeNode } from 'primeng/api';
import { ImageModule } from 'primeng/image';
import { FileUploadModule } from 'primeng/fileupload';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-user-form',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    FormsModule,
    TreeSelectModule,
    ImageModule,
    FileUploadModule,
  ],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
  providers: [MessageService],
})
export class UserForm {
  fb = inject(FormBuilder);
  userService = inject(UserService);
  locationService = inject(LocationService);
  titleService = inject(TitleService);
  messageService = inject(MessageService);
  sanitizer = inject(DomSanitizer);

  user = input<any>(null);
  onSave = output<void>();
  onCancel = output<void>();

  locations: TreeNode[] = [];
  titles: any[] = [];
  imagePath = signal<any>(null);

  titleDialogVisible = false;
  newTitle = '';

  form = this.fb.group({
    id: [null],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    barcode: [''],
    location: [null],
    title: [null as any],
    image_path: [''],
  });

  constructor() {
    console.log('UserForm constructor called');
    this.loadLocations();
    this.loadTitles();

    effect(() => {
      const u = this.user();
      console.log('UserForm effect triggered with user:', u);
      if (u) {
        // Prepare location for TreeSelect (needs partial node object or key)
        const formData = { ...u };
        if (u.location) {
          formData.location = {
            label: u.location.denomination,
            data: u.location,
            key: u.location.id.toString(),
          };
        }
        this.form.patchValue(formData);
        
        // Handle image path protocol for display
        // If it starts with local-resource://, we can use it directly if we registered the protocol
        // Or if we need to bypass security in dev mode
        if (u.image_path) {
          this.imagePath.set(this.sanitizer.bypassSecurityTrustUrl(u.image_path));
        } else {
          this.imagePath.set(null);
        }
      } else {
        this.form.reset();
        this.imagePath.set(null);
      }
    });
  }

  ngOnInit() {
    console.log('UserForm initialized');
  }

  async loadLocations() {
    const locations = await this.locationService.getAll();
    this.locations = this.transformToTree(locations);
  }

  transformToTree(locations: any[]): TreeNode[] {
    const map = new Map<number, TreeNode>();
    const roots: TreeNode[] = [];

    // First pass: create nodes
    locations.forEach((loc) => {
      map.set(loc.id, {
        label: loc.denomination,
        data: loc,
        key: loc.id.toString(),
        children: [],
        expanded: true,
      });
    });

    // Second pass: build hierarchy
    locations.forEach((loc) => {
      const node = map.get(loc.id);
      if (node) {
        if (loc.parent) {
          const parentNode = map.get(loc.parent.id);
          if (parentNode) {
            parentNode.children?.push(node);
          }
        } else {
          roots.push(node);
        }
      }
    });

    return roots;
  }

  async loadTitles() {
    const titles = await this.titleService.getAll();
    this.titles = titles.map((t) => ({ label: t.title, value: t }));
  }

  openTitleDialog() {
    this.newTitle = '';
    this.titleDialogVisible = true;
  }

  async saveTitle() {
    if (!this.newTitle) return;

    try {
      const newTitleObj = await this.titleService.create({ title: this.newTitle });
      const newOption = { label: newTitleObj.title, value: newTitleObj };
      this.titles = [...this.titles, newOption];

      this.form.patchValue({ title: newTitleObj });

      this.titleDialogVisible = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Title added successfully',
      });
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add title',
      });
    }
  }

  async onImageSelect(event: any) {
    const file = event.currentFiles?.[0] ?? event.files?.[0];
    if (!file) return;

    // Immediate preview from blob URL
    const previewUrl = file.objectURL
      ?? this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
    this.imagePath.set(previewUrl);

    // Persist via Electron upload
    const filePath = this.userService.getFilePath(file);
    if (filePath) {
      try {
        const uploadedPath = await this.userService.uploadImage(filePath);
        this.imagePath.set(this.sanitizer.bypassSecurityTrustUrl(uploadedPath));
        this.form.patchValue({ image_path: uploadedPath });
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Image uploaded successfully',
        });
      } catch (error) {
        console.error('Image upload failed:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to upload image',
        });
      }
    }
  }

  async save() {
    if (this.form.invalid) return;

    const formValue = this.form.value;
    // Extract actual location object from TreeSelect node (which puts the node in the control)
    const location = formValue.location ? (formValue.location as any).data || formValue.location : null;

    const userData = {
      ...formValue,
      location: location,
    };

    try {
      if (userData.id) {
        await this.userService.update(userData);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User updated successfully',
        });
      } else {
        await this.userService.create(userData);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User created successfully',
        });
      }
      this.onSave.emit();
    } catch (error) {
      console.error(error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save user',
      });
    }
  }

  cancel() {
    this.onCancel.emit();
  }
}
