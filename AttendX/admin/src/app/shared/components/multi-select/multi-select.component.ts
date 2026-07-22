import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  NgZone,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface SelectOption {
  id: number | string;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-multi-select',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.scss',
})
export class MultiSelectComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() options: SelectOption[] = [];
  @Input() selected: (number | string)[] = [];
  @Input() placeholder = 'Select...';
  @Input() searchPlaceholder = 'Search...';
  @Output() selectedChange = new EventEmitter<(number | string)[]>();

  @ViewChild('container') containerRef?: ElementRef;
  @ViewChild('trigger') triggerRef?: ElementRef;
  @ViewChild('searchInput') searchInputRef?: ElementRef;

  readonly isOpen = signal(false);
  readonly searchQuery = signal('');
  readonly focusedIndex = signal(-1);

  private boundDocumentClick?: (e: MouseEvent) => void;

  readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.options;
    return this.options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
    );
  });

  readonly selectedOptions = computed(() =>
    this.options.filter((opt) => this.selected.includes(opt.id))
  );

  readonly selectedCount = computed(() => this.selected.length);

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.boundDocumentClick = (e: MouseEvent) => {
      this.ngZone.run(() => {
        if (this.containerRef && !this.containerRef.nativeElement.contains(e.target)) {
          this.close();
        }
      });
    };
    document.addEventListener('click', this.boundDocumentClick, true);
  }

  ngOnDestroy(): void {
    if (this.boundDocumentClick) {
      document.removeEventListener('click', this.boundDocumentClick, true);
    }
  }

  toggleDropdown(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.isOpen.set(true);
      this.searchQuery.set('');
      this.focusedIndex.set(-1);
      setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 0);
    }
  }

  close(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
      this.searchQuery.set('');
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.focusedIndex.set(-1);
  }

  toggleOption(option: SelectOption, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    const current = [...this.selected];
    const index = current.indexOf(option.id);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(option.id);
    }
    this.selectedChange.emit(current);
  }

  removeOption(option: SelectOption, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.selected.filter((id) => id !== option.id);
    this.selectedChange.emit(current);
  }

  isSelected(option: SelectOption): boolean {
    return this.selected.includes(option.id);
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.isOpen()) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.toggleDropdown();
      }
      return;
    }

    const options = this.filteredOptions();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex.update((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex.update((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.focusedIndex() >= 0 && this.focusedIndex() < options.length) {
          this.toggleOption(options[this.focusedIndex()]);
        }
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  clearAll(event: MouseEvent): void {
    event.stopPropagation();
    this.selectedChange.emit([]);
  }
}
