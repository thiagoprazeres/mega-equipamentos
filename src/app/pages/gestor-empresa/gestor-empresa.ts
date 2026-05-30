import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Bold,
  Building2,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  LogOut,
  PencilLine,
  Quote,
  Save,
  LucideAngularModule,
} from 'lucide-angular';

import { AuthService } from '../../services/auth.service';
import {
  CompanyProfileEditorInput,
  CompanyProfileService,
} from '../../services/company-profile.service';
import { normalizeContractTerms } from '../../utils/contract-terms';

const COMPANY_LOAD_TIMEOUT_MS = 4500;

@Component({
  selector: 'app-gestor-empresa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './gestor-empresa.html',
})
export class GestorEmpresaPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly Building2 = Building2;
  protected readonly Bold = Bold;
  protected readonly Eye = Eye;
  protected readonly Heading1 = Heading1;
  protected readonly Heading2 = Heading2;
  protected readonly Italic = Italic;
  protected readonly Link = Link;
  protected readonly List = List;
  protected readonly ListOrdered = ListOrdered;
  protected readonly LogOut = LogOut;
  protected readonly PencilLine = PencilLine;
  protected readonly Quote = Quote;
  protected readonly Save = Save;

  protected loading = false;
  protected saving = false;
  protected errorMessage = '';
  protected successMessage = '';
  protected contractTermsView: 'editor' | 'preview' | 'split' = 'split';

  protected readonly form = this.formBuilder.nonNullable.group({
    legalName: ['', Validators.required],
    tradeName: [''],
    document: [''],
    pixKey: [''],
    email: ['', Validators.email],
    gmailPassword: [''],
    phone: [''],
    whatsapp: [''],
    address: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    instagramLogin: [''],
    instagramPassword: [''],
    contractTerms: [''],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly companyProfileService: CompanyProfileService,
    private readonly router: Router
  ) {}

  async ngOnInit() {
    if (isBrowserRuntime()) {
      await this.loadCompanyProfile();
    }
  }

  protected async saveCompanyProfile() {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const value = this.form.getRawValue();
      const payload: CompanyProfileEditorInput = {
        legalName: value.legalName,
        tradeName: value.tradeName,
        document: value.document,
        pixKey: value.pixKey,
        email: value.email,
        gmailPassword: value.gmailPassword,
        phone: value.phone,
        whatsapp: value.whatsapp,
        address: value.address,
        city: value.city,
        state: value.state,
        zipCode: value.zipCode,
        instagramLogin: value.instagramLogin,
        instagramPassword: value.instagramPassword,
        contractTerms: value.contractTerms,
      };

      await this.companyProfileService.saveCompanyProfile(payload);
      this.successMessage = 'Dados da empresa salvos com sucesso.';
    } catch (error) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Não foi possível salvar os dados da empresa.';
    } finally {
      this.saving = false;
      this.changeDetector.detectChanges();
    }
  }

  protected async signOut() {
    await this.authService.signOut();
    void this.router.navigateByUrl('/gestor/login');
  }

  protected insertMarkdown(format: MarkdownFormat, textarea: HTMLTextAreaElement): void {
    const control = this.form.controls.contractTerms;
    const currentValue = control.value ?? '';
    const start = textarea.selectionStart ?? currentValue.length;
    const end = textarea.selectionEnd ?? start;
    const selectedText = currentValue.slice(start, end);
    const next = markdownInsertion(format, selectedText);
    const nextValue = `${currentValue.slice(0, start)}${next.text}${currentValue.slice(end)}`;

    control.setValue(nextValue);
    control.markAsDirty();
    control.markAsTouched();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + next.selectionStart, start + next.selectionEnd);
    });
  }

  protected contractTermsPreviewHtml(): string {
    return renderMarkdown(this.form.controls.contractTerms.value);
  }

  private async loadCompanyProfile() {
    this.loading = true;
    this.errorMessage = '';

    try {
      const profile = await withTimeout(
        this.companyProfileService.getCompanyProfile(),
        COMPANY_LOAD_TIMEOUT_MS
      );

      this.form.reset({
        legalName: profile.legalName,
        tradeName: profile.tradeName ?? '',
        document: profile.document ?? '',
        pixKey: profile.pixKey ?? '',
        email: profile.email ?? '',
        gmailPassword: profile.gmailPassword ?? '',
        phone: profile.phone ?? '',
        whatsapp: profile.whatsapp ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        zipCode: profile.zipCode ?? '',
        instagramLogin: profile.instagramLogin ?? '',
        instagramPassword: profile.instagramPassword ?? '',
        contractTerms: normalizeContractTerms(profile.contractTerms),
      });
    } catch (error) {
      console.error('company profile load failed', error);
      this.errorMessage = 'Não foi possível carregar os dados da empresa.';
    } finally {
      this.loading = false;
      this.changeDetector.detectChanges();
    }
  }
}

type MarkdownFormat = 'h1' | 'h2' | 'bold' | 'italic' | 'unorderedList' | 'orderedList' | 'quote' | 'link';

type MarkdownInsertion = {
  text: string;
  selectionStart: number;
  selectionEnd: number;
};

function markdownInsertion(format: MarkdownFormat, selectedText: string): MarkdownInsertion {
  const fallbackText = selectedText || placeholderForFormat(format);

  switch (format) {
    case 'h1':
      return prefixLines(fallbackText, '# ');
    case 'h2':
      return prefixLines(fallbackText, '## ');
    case 'bold':
      return wrapSelection(fallbackText, '**', '**', selectedText);
    case 'italic':
      return wrapSelection(fallbackText, '*', '*', selectedText);
    case 'unorderedList':
      return prefixLines(fallbackText, '- ');
    case 'orderedList':
      return prefixOrderedLines(fallbackText);
    case 'quote':
      return prefixLines(fallbackText, '> ');
    case 'link':
      return linkInsertion(fallbackText, selectedText);
  }
}

function placeholderForFormat(format: MarkdownFormat): string {
  switch (format) {
    case 'h1':
      return 'Título principal';
    case 'h2':
      return 'Subtítulo';
    case 'unorderedList':
    case 'orderedList':
      return 'Nova cláusula';
    case 'quote':
      return 'Observação importante';
    case 'link':
      return 'texto do link';
    default:
      return 'texto';
  }
}

function wrapSelection(
  text: string,
  before: string,
  after: string,
  originalSelection: string
): MarkdownInsertion {
  const wrappedText = `${before}${text}${after}`;
  const selectionStart = before.length;
  const selectionEnd = before.length + text.length;

  return {
    text: wrappedText,
    selectionStart: originalSelection ? wrappedText.length : selectionStart,
    selectionEnd: originalSelection ? wrappedText.length : selectionEnd,
  };
}

function prefixLines(text: string, prefix: string): MarkdownInsertion {
  const prefixedText = text
    .split('\n')
    .map((line) => `${prefix}${line || placeholderForFormat('unorderedList')}`)
    .join('\n');

  return {
    text: prefixedText,
    selectionStart: prefixedText.length,
    selectionEnd: prefixedText.length,
  };
}

function prefixOrderedLines(text: string): MarkdownInsertion {
  const prefixedText = text
    .split('\n')
    .map((line, index) => `${index + 1}. ${line || 'Nova cláusula'}`)
    .join('\n');

  return {
    text: prefixedText,
    selectionStart: prefixedText.length,
    selectionEnd: prefixedText.length,
  };
}

function linkInsertion(text: string, originalSelection: string): MarkdownInsertion {
  const url = 'https://';
  const linkText = `[${text}](${url})`;
  const selectionStart = linkText.length - url.length - 1;
  const selectionEnd = linkText.length - 1;

  return {
    text: linkText,
    selectionStart: originalSelection ? selectionStart : 1,
    selectionEnd: originalSelection ? selectionEnd : 1 + text.length,
  };
}

function renderMarkdown(value: string): string {
  const lines = value.trim().split(/\r?\n/);
  const html: string[] = [];
  let paragraphLines: string[] = [];
  let activeList: 'ul' | 'ol' | null = null;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
    paragraphLines = [];
  };

  const closeList = () => {
    if (!activeList) {
      return;
    }

    html.push(`</${activeList}>`);
    activeList = null;
  };

  if (!value.trim()) {
    return '<p>Sem conteúdo.</p>';
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmedLine);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmedLine)) {
      flushParagraph();
      closeList();
      html.push('<hr>');
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmedLine);
    if (unorderedMatch) {
      flushParagraph();
      if (activeList !== 'ul') {
        closeList();
        html.push('<ul>');
        activeList = 'ul';
      }
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmedLine);
    if (orderedMatch) {
      flushParagraph();
      if (activeList !== 'ol') {
        closeList();
        html.push('<ol>');
        activeList = 'ol';
      }
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    const quoteMatch = /^>\s?(.+)$/.exec(trimmedLine);
    if (quoteMatch) {
      flushParagraph();
      closeList();
      html.push(`<blockquote>${renderInlineMarkdown(quoteMatch[1])}</blockquote>`);
      continue;
    }

    closeList();
    paragraphLines.push(trimmedLine);
  }

  flushParagraph();
  closeList();

  return html.join('');
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function withTimeout<Result>(promise: Promise<Result>, timeoutMs: number): Promise<Result> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('COMPANY_LOAD_TIMEOUT'));
    }, timeoutMs);

    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}
