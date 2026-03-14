import { Component, input, inject, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { NoteService } from '../../../services/note.service';
import { MessageService } from 'primeng/api';
import { ScrollPanelModule } from 'primeng/scrollpanel';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, ScrollPanelModule],
  templateUrl: './notes.html',
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class NotesComponent {
  entityType = input.required<string>();
  entityId = input.required<number>();
  floating = input<boolean>(false);
  
  noteService = inject(NoteService);
  messageService = inject(MessageService);

  notes = signal<any[]>([]);
  newNoteContent = signal('');
  loading = signal(false);
  scrollPanelStyle = computed(() => ({
    width: this.floating() ? '100%' : '100%',
    height: this.floating() ? '200px' : '300px',
  }));

  constructor() {
    effect(() => {
      const type = this.entityType();
      const id = this.entityId();
      if (type && id) {
        this.loadNotes();
      }
    });
  }

  async loadNotes() {
    try {
      this.loading.set(true);
      const notes = await this.noteService.getByEntity(this.entityType(), this.entityId());
      this.notes.set(notes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async addNote() {
    if (!this.newNoteContent().trim()) return;

    try {
      const noteData: any = {
        content: this.newNoteContent(),
      };
      // Dynamic key for relation
      noteData[`${this.entityType()}_id`] = this.entityId();

      await this.noteService.create(noteData);
      this.newNoteContent.set('');
      await this.loadNotes();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Note added',
      });
    } catch (error) {
      console.error('Error adding note:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add note',
      });
    }
  }

  async deleteNote(id: number) {
    try {
      await this.noteService.delete(id);
      await this.loadNotes();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Note deleted',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to delete note',
      });
    }
  }
}
