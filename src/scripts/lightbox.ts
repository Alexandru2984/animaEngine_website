/**
 * Opens [data-lightbox] links in a modal <dialog> with previous/next. The
 * dialog is native: Escape closes it, the page behind is inert, and focus
 * returns to the thumbnail that opened it.
 */

const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-lightbox]')];

if (dialog && links.length > 0 && typeof dialog.showModal === 'function') {
  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]')!;
  const count = dialog.querySelector<HTMLElement>('[data-lightbox-count]');
  let index = 0;
  let opener: HTMLElement | null = null;

  const show = (i: number) => {
    index = (i + links.length) % links.length;
    const link = links[index]!;
    img.src = link.dataset.fullSrc ?? link.href;
    img.width = Number(link.dataset.fullWidth) || 1920;
    img.height = Number(link.dataset.fullHeight) || 1080;
    img.alt = link.dataset.alt ?? '';
    caption.textContent = link.dataset.caption ?? '';
    if (count) count.textContent = `${index + 1} / ${links.length}`;
  };

  links.forEach((link, i) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return; // let "open in new tab" work
      event.preventDefault();
      opener = link;
      show(i);
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-lightbox-close]')?.focus();
    });
  });

  dialog.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-lightbox-next]')?.addEventListener('click', () => show(index + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'ArrowRight') show(index + 1);
  });

  // A click on the backdrop (outside the content box) closes.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('close', () => {
    opener?.focus();
    opener = null;
  });
}

export {};
