import { Component, input, output, signal } from '@angular/core';
import type { Biome, AttachmentType } from '../../data-access/educa/models';
import { ATTACHMENT_TYPE_LABEL } from '../labels';

export type EditorKind = 'section' | 'module' | 'attachment';

export interface EditorResult {
  title: string;
  description: string;
  color?: string;
  biome?: Biome;
  type?: AttachmentType;
  url?: string;
}

@Component({
  selector: 'app-entity-editor-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" (click)="cancel.emit()">
      <div class="w-full max-w-md rounded-xl bg-base-100 border border-base-300 p-5 shadow-2xl" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="heading()">
        <div class="flex items-center justify-between border-b border-base-300 pb-3">
          <h2 class="text-base font-bold title-font text-primary">{{ heading() }}</h2>
          <button (click)="cancel.emit()" class="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content">✕</button>
        </div>

        <label class="mt-3 block text-xs font-semibold ui-font">Título
          <input [value]="title()" (input)="title.set(inputValue($event))"
            placeholder="Nombre o título..."
            class="input input-bordered input-sm w-full mt-1" />
        </label>

        <label class="mt-2 block text-xs font-semibold ui-font">Descripción
          <textarea [value]="description()" (input)="description.set(inputValue($event))" rows="2"
            placeholder="Descripción u objetivos..."
            class="textarea textarea-bordered textarea-sm w-full mt-1"></textarea>
        </label>

        @if (kind() === 'section') {
          <div class="mt-2 grid grid-cols-2 gap-3 items-center">
            <label class="block text-xs font-semibold ui-font">Color
              <div class="flex items-center gap-2 mt-1">
                <input type="color" [value]="color()" (input)="color.set(inputValue($event))" class="h-8 w-12 rounded cursor-pointer border border-base-300 bg-transparent" />
                <span class="text-xs opacity-70 font-mono">{{ color() }}</span>
              </div>
            </label>

            <label class="block text-xs font-semibold ui-font">Bioma (Mundo 3D)
              <select [value]="biome()" (change)="biome.set(inputBiome($event))" class="select select-bordered select-sm w-full mt-1">
                <option value="meadow">🌿 Pradera</option>
                <option value="desert">🏜️ Desierto</option>
                <option value="snow">❄️ Nieve</option>
                <option value="lava">🌋 Lava</option>
              </select>
            </label>
          </div>
        }

        @if (kind() === 'attachment') {
          <div class="mt-2 flex flex-col sm:flex-row gap-2">
            <label class="text-xs font-semibold ui-font">Tipo
              <select [value]="type()" (change)="type.set(inputType($event))" class="select select-bordered select-sm w-full mt-1">
                @for (t of types; track t) {
                  <option [value]="t">{{ iconOf(t) }} {{ typeLabel[t] }}</option>
                }
              </select>
            </label>
            <label class="flex-1 text-xs font-semibold ui-font">URL del recurso
              <input [value]="url()" (input)="url.set(inputValue($event))" placeholder="https://…"
                class="input input-bordered input-sm w-full mt-1" />
            </label>
          </div>
        }

        <div class="mt-5 flex justify-end gap-2 border-t border-base-300 pt-3">
          <button (click)="cancel.emit()" class="btn btn-sm btn-ghost ui-font text-[9px]">Cancelar</button>
          <button (click)="save()" [disabled]="!title().trim()" class="btn btn-sm btn-primary ui-font text-[9px]">Guardar</button>
        </div>
      </div>
    </div>
  `,
})
export class EntityEditorDialogComponent {
  kind = input<EditorKind>('section');
  heading = input('Editar');
  initialTitle = input('');
  initialDescription = input('');
  initialColor = input('#6366f1');
  initialBiome = input<Biome>('meadow');
  initialType = input<AttachmentType>('document');
  initialUrl = input('');

  saveResult = output<EditorResult>();
  cancel = output<void>();

  title = signal('');
  description = signal('');
  color = signal('#6366f1');
  biome = signal<Biome>('meadow');
  type = signal<AttachmentType>('document');
  url = signal('');
  typeLabel = ATTACHMENT_TYPE_LABEL;
  types: AttachmentType[] = ['document', 'video', 'link', 'image', 'exercise'];

  constructor() {
    queueMicrotask(() => {
      this.title.set(this.initialTitle());
      this.description.set(this.initialDescription());
      this.color.set(this.initialColor());
      this.biome.set(this.initialBiome());
      this.type.set(this.initialType());
      this.url.set(this.initialUrl());
    });
  }

  inputValue(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
  }

  inputType(e: Event): AttachmentType {
    const val = (e.target as HTMLSelectElement | null)?.value;
    return (this.types.includes(val as AttachmentType) ? val : 'document') as AttachmentType;
  }

  inputBiome(e: Event): Biome {
    const val = (e.target as HTMLSelectElement | null)?.value;
    if (val === 'desert') return 'desert';
    if (val === 'snow') return 'snow';
    if (val === 'lava') return 'lava';
    return 'meadow';
  }

  iconOf(t: AttachmentType): string {
    switch (t) {
      case 'document': return '📄';
      case 'video': return '🎬';
      case 'link': return '🔗';
      case 'image': return '🖼️';
      case 'exercise': return '✏️';
      default: return '📦';
    }
  }

  save(): void {
    this.saveResult.emit({
      title: this.title().trim(),
      description: this.description(),
      color: this.color(),
      biome: this.biome(),
      type: this.type(),
      url: this.url(),
    });
  }
}
