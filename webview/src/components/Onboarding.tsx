import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'jito-onboarding-seen';
const CURRENT_VERSION = 'v0.2.0';

function hasSeen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === CURRENT_VERSION;
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
  } catch {
    // noop
  }
}

interface OnboardingProps {
  onComplete?: () => void;
  onSkip?: () => void;
  forceShow?: boolean;
}

interface Step {
  id: string;
  title: string;
  body: string;
  visual: ReactNode;
}

const MODES = [
  { icon: '⚙️', label: 'Dev' },
  { icon: '🧠', label: 'Reason' },
  { icon: '🎨', label: 'Create' },
  { icon: '🛡️', label: 'Audit' },
  { icon: '🌐', label: 'Universal' },
];

const COMMANDS = [
  { cmd: '/review', desc: 'Find issues' },
  { cmd: '/test', desc: 'Generate tests' },
  { cmd: '/refactor', desc: 'Improve structure' },
  { cmd: '/doc', desc: 'Write docs' },
];

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: 'Welcome to jito',
    body: 'Your AI pair programmer, built for solo devs who ship. Five first-class modes, one shortcut away.',
    visual: (
      <div className="onboarding-logo">
        <span className="onboarding-logo__mark" aria-hidden="true">⚡</span>
        <span className="onboarding-logo__name">jito</span>
        <span className="onboarding-logo__tag">ship with focus</span>
      </div>
    ),
  },
  {
    id: 'pick-mode',
    title: 'Pick your mode',
    body: 'Switch modes to shape how jito helps you. Each one tunes the prompt, the model, and the tools.',
    visual: (
      <div className="onboarding-modes" aria-label="Available modes">
        {MODES.map((mode) => (
          <span className="onboarding-mode-chip" key={mode.label}>
            <span aria-hidden="true">{mode.icon}</span>
            {mode.label}
          </span>
        ))}
      </div>
    ),
  },
  {
    id: 'add-files',
    title: 'Add files to context',
    body: 'Click 📎 in the composer toolbar to attach files. jito reads them and answers against the real source.',
    visual: (
      <div className="onboarding-mock-composer">
        <div className="onboarding-mock-attachments">
          <span className="onboarding-mock-file">📎 src/App.tsx</span>
          <span className="onboarding-mock-file">Composer.tsx</span>
        </div>
        <span className="onboarding-mock-input">Ask jito about the selected files...</span>
      </div>
    ),
  },
  {
    id: 'slash-commands',
    title: 'Slash commands',
    body: 'Type "/" to open the command palette. Try /review, /test, /refactor, /doc.',
    visual: (
      <div className="onboarding-cmds">
        {COMMANDS.map((command) => (
          <div className="onboarding-cmd" key={command.cmd}>
            <span className="onboarding-cmd__name">{command.cmd}</span>
            <span className="onboarding-cmd__desc">{command.desc}</span>
          </div>
        ))}
      </div>
    ),
  },
];

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
  );
}

export function Onboarding({ onComplete, onSkip, forceShow = false }: OnboardingProps) {
  const [visible, setVisible] = useState(() => forceShow || !hasSeen());
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!visible) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [visible]);

  const finish = useCallback(() => {
    markSeen();
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    markSeen();
    setVisible(false);
    onSkip?.();
  }, [onSkip]);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    finish();
  }, [finish, step]);

  const back = useCallback(() => {
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const handleBackdropClick = useCallback(() => {
    skip();
  }, [skip]);

  const handleCardClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      skip();
      return;
    }

    if (event.key !== 'Tab' || !cardRef.current) return;

    const focusable = getFocusableElements(cardRef.current);
    if (focusable.length === 0) return;

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1)
      : (currentIndex === -1 || currentIndex === focusable.length - 1 ? 0 : currentIndex + 1);

    event.preventDefault();
    focusable[nextIndex]?.focus();
  }, [skip]);

  if (!visible) {
    return null;
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="onboarding-backdrop" onClick={handleBackdropClick}>
      <div
        ref={cardRef}
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
      >
        <header className="onboarding-card__header">
          <div>
            <span className="onboarding-card__bolt" aria-hidden="true">⚡</span>
            <h2 id="onboarding-title">{currentStep.title}</h2>
          </div>
          <button className="onboarding-card__skip" onClick={skip}>Skip</button>
        </header>

        <div className="onboarding-card__body">
          <p className="onboarding-card__copy">{currentStep.body}</p>
          <div className="onboarding-card__visual">{currentStep.visual}</div>
        </div>

        <footer className="onboarding-card__footer">
          <div className="onboarding-card__dots" aria-hidden="true">
            {STEPS.map((item, index) => (
              <span
                key={item.id}
                className={`onboarding-card__dot ${
                  index === step ? 'onboarding-card__dot--active' : ''
                }`}
              />
            ))}
          </div>
          <div className="onboarding-card__actions">
            {step > 0 && (
              <button
                className="onboarding-card__btn onboarding-card__btn--ghost"
                onClick={back}
              >
                ← Back
              </button>
            )}
            {isLastStep ? (
              <button
                ref={primaryButtonRef}
                className="onboarding-card__btn onboarding-card__btn--primary"
                onClick={finish}
              >
                Get started
              </button>
            ) : (
              <button
                ref={primaryButtonRef}
                className="onboarding-card__btn onboarding-card__btn--primary"
                onClick={next}
              >
                Next →
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
