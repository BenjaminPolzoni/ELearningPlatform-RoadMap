import { Component, input, output, signal } from '@angular/core';
import type { Biome, TipoAnexo } from '../../../core/educa/models';

export type EditorKind = 'unidad' | 'modulo' | 'anexo';

export interface EditorResult {
  titulo: string;
  descripcion: string;
  color?: string;
  bioma?: Biome;
  tipo?: TipoAnexo;
  url?: string;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" (click)="cancel.emit()">
      <div class="w-full max-w-md rounded-xl bg-base-100 border border-base-300 p-5 shadow-2xl" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" [attr.aria-label]="heading()">
        <div class="flex items-center justify-between border-b border-base-300 pb-3">
          <h2 class="text-base font-bold title-font text-primary">{{ heading() }}</h2>
          <button (click)="cancel.emit()" class="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content">✕</button>
        </div>

        <label class="mt-3 block text-xs font-semibold ui-font">Título
          <input [value]="titulo()" (input)="titulo.set(inputValue($event))"
            placeholder="Nombre o título..."
            class="input input-bordered input-sm w-full mt-1" />
        </label>

        <label class="mt-2 block text-xs font-semibold ui-font">Descripción
          <textarea [value]="descripcion()" (input)="descripcion.set(inputValue($event))" rows="2"
            placeholder="Descripción u objetivos..."
            class="textarea textarea-bordered textarea-sm w-full mt-1"></textarea>
        </label>

        @if (kind() === 'unidad') {
          <div class="mt-2 grid grid-cols-2 gap-3 items-center">
            <label class="block text-xs font-semibold ui-font">Color
              <div class="flex items-center gap-2 mt-1">
                <input type="color" [value]="color()" (input)="color.set(inputValue($event))" class="h-8 w-12 rounded cursor-pointer border border-base-300 bg-transparent" />
                <span class="text-xs opacity-70 font-mono">{{ color() }}</span>
              </div>
            </label>

            <label class="block text-xs font-semibold ui-font">Bioma (Mundo 3D)
              <select [value]="bioma()" (change)="bioma.set(inputBioma($event))" class="select select-bordered select-sm w-full mt-1">
                <option value="pradera">🌿 Pradera</option>
                <option value="desierto">🏜️ Desierto</option>
                <option value="nieve">❄️ Nieve</option>
                <option value="lava">🌋 Lava</option>
              </select>
            </label>
          </div>
        }

        @if (kind() === 'anexo') {
          <div class="mt-2 flex flex-col sm:flex-row gap-2">
            <label class="text-xs font-semibold ui-font">Tipo
              <select [value]="tipo()" (change)="tipo.set(inputTipo($event))" class="select select-bordered select-sm w-full mt-1">
                @for (t of tipos; track t) {
                  <option [value]="t">{{ iconoDe(t) }} {{ t }}</option>
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
          <button (click)="save()" [disabled]="!titulo().trim()" class="btn btn-sm btn-primary ui-font text-[9px]">Guardar</button>
        </div>
      </div>
    </div>
  `,
})
export class EditorComponent {
  kind = input<EditorKind>('unidad');
  heading = input('Editar');
  initialTitulo = input('');
  initialDescripcion = input('');
  initialColor = input('#6366f1');
  initialBioma = input<Biome>('pradera');
  initialTipo = input<TipoAnexo>('documento');
  initialUrl = input('');

  saveResult = output<EditorResult>();
  cancel = output<void>();

  titulo = signal('');
  descripcion = signal('');
  color = signal('#6366f1');
  bioma = signal<Biome>('pradera');
  tipo = signal<TipoAnexo>('documento');
  url = signal('');
  tipos: TipoAnexo[] = ['documento', 'video', 'enlace', 'imagen', 'ejercicio'];

  constructor() {
    queueMicrotask(() => {
      this.titulo.set(this.initialTitulo());
      this.descripcion.set(this.initialDescripcion());
      this.color.set(this.initialColor());
      this.bioma.set(this.initialBioma());
      this.tipo.set(this.initialTipo());
      this.url.set(this.initialUrl());
    });
  }

  inputValue(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value ?? '';
  }

  inputTipo(e: Event): TipoAnexo {
    const val = (e.target as HTMLSelectElement | null)?.value;
    return (this.tipos.includes(val as TipoAnexo) ? val : 'documento') as TipoAnexo;
  }

  inputBioma(e: Event): Biome {
    const val = (e.target as HTMLSelectElement | null)?.value;
    if (val === 'desierto') return 'desierto';
    if (val === 'nieve') return 'nieve';
    if (val === 'lava') return 'lava';
    return 'pradera';
  }

  iconoDe(t: TipoAnexo): string {
    switch (t) {
      case 'documento': return '📄';
      case 'video': return '🎬';
      case 'enlace': return '🔗';
      case 'imagen': return '🖼️';
      case 'ejercicio': return '✏️';
      default: return '📦';
    }
  }

  save(): void {
    this.saveResult.emit({
      titulo: this.titulo().trim(),
      descripcion: this.descripcion(),
      color: this.color(),
      bioma: this.bioma(),
      tipo: this.tipo(),
      url: this.url(),
    });
  }
}
