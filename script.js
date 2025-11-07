const form = document.querySelector('.search-form');
const input = document.querySelector('#query');
const clearBtn = document.querySelector('.clear');
const luckyBtn = document.querySelector('.lucky');

function updateClearButton() {
  if (input.value.trim()) {
    clearBtn.classList.add('visible');
  } else {
    clearBtn.classList.remove('visible');
  }
}

input.addEventListener('input', updateClearButton);

clearBtn.addEventListener('click', () => {
  input.value = '';
  updateClearButton();
  input.focus();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const term = input.value.trim();

  if (!term) {
    input.focus();
    return;
  }

  const url = `https://www.google.com/search?q=${encodeURIComponent(term)}`;
  window.open(url, '_blank', 'noopener');
});

luckyBtn.addEventListener('click', () => {
  const term = input.value.trim();
  const url = term
    ? `https://www.google.com/search?btnI=I&q=${encodeURIComponent(term)}`
    : 'https://www.google.com/doodles';
  window.open(url, '_blank', 'noopener');
});

updateClearButton();
