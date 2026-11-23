import './styles.css';
import { Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from './task4-integration';
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';
import { fetchBooks, saveBook, deleteBook } from './api';

// ============================================================
// ИСХОДНОЕ СОСТОЯНИЕ
// ============================================================
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success', data: T }
  | { status: 'error', message: string };

let state: AsyncState<Book[]> = { status: 'loading' };
let saveErrorMessage = '';

let catalog = new BookCatalog('main', []);
let wishlist = new Wishlist();

const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist));
}

// ============================================================
// DOM-элементы
// ============================================================
const bookList = document.querySelector('#bookList') as HTMLDivElement;
const wishlistContainer = document.querySelector('#wishlistContainer') as HTMLDivElement;
const form = document.querySelector('#bookForm') as HTMLFormElement;
const filterBtn = document.querySelector('#applyFilters') as HTMLButtonElement;
const authorInput = document.querySelector('#filterAuthor') as HTMLInputElement;
const yearInput = document.querySelector('#filterYear') as HTMLInputElement;
const errorMessage = document.querySelector('#errorMessage') as HTMLDivElement;
const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
const sortBySelect = document.querySelector('#sortBy') as HTMLSelectElement;

// ============================================================
// ВСПОМОГАТЕЛЬНОЕ: показ временной ошибки
// ============================================================
function showTemporaryError(error: unknown) {
  saveErrorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
  if (errorMessage) {
    errorMessage.textContent = saveErrorMessage;
    errorMessage.style.color = 'orange';
  }
}

function clearTemporaryError() {
  saveErrorMessage = '';
  if (errorMessage) {
    errorMessage.textContent = '';
  }
}

// ============================================================
// СОХРАНЕНИЕ ИЗБРАННОГО
// ============================================================
function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}

// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  // Кнопка «Удалить» — теперь настоящий DELETE-запрос
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.status !== 'success') return;

    try {
      await deleteBook(book.id);
      catalog.removeBook(book.id);
      state = {
        status: 'success',
        data: state.data.filter((b) => b.id !== book.id),
      };
      clearTemporaryError();
      render();
    } catch (error) {
      // Список не трогаем — показываем временное сообщение
      showTemporaryError(error);
      render();
    }
  });
  card.append(deleteBtn);

  // Кнопка «Избранное»
  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    saveWishlist();
    updateView();
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderBooks(books: Book[]) {
  bookList.innerHTML = '';

  if (books.length === 0) {
    bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
    return;
  }

  books.forEach(book => {
    bookList.append(createBookCard(book));
  });
}

function renderWishlist() {
  wishlistContainer.innerHTML = '';
  const favBooks = wishlist.getFavorites(catalog);

  if (favBooks.length === 0) {
    wishlistContainer.textContent = 'Пока ничего не добавлено';
    return;
  }

  favBooks.forEach(book => {
    wishlistContainer.append(createBookCard(book));
  });
}

function updateView() {
  const filters: ((book: Book) => boolean)[] = [];
  if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
  if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
  if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));

  const allBooks = catalog.getBooks();
  const filtered = applyFilters(allBooks, filters);
  const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

  renderBooks(sorted);
  renderWishlist();
}

function render() {
  bookList.innerHTML = '';
  wishlistContainer.innerHTML = '';

  // Временное сообщение об ошибке сохранения/удаления — не сбрасывает список
  if (saveErrorMessage) {
    const saveErrorDiv = document.createElement('div');
    saveErrorDiv.textContent = saveErrorMessage;
    saveErrorDiv.style.color = 'orange';
    bookList.append(saveErrorDiv);
  }

  switch (state.status) {
    case 'idle':
      bookList.textContent = 'Нажмите для загрузки...';
      break;
    case 'loading':
      bookList.textContent = 'Загрузка данных...';
      break;
    case 'success':
      updateView();
      break;
    case 'error': {
      const errorDiv = document.createElement('div');
      errorDiv.textContent = state.message;
      errorDiv.style.color = 'red';
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Повторить попытку';
      retryBtn.addEventListener('click', initApp);
      errorDiv.append(retryBtn);
      bookList.append(errorDiv);
      break;
    }
  }
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initApp() {
  state = { status: 'loading' };
  clearTemporaryError();
  render();

  try {
    const books = await fetchBooks();
    catalog = new BookCatalog('main', books);
    state = { status: 'success', data: books };
  } catch (error) {
    state = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }
  render();
}

document.addEventListener('DOMContentLoaded', initApp);

// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearTemporaryError();

  let newBook: Book;
  try {
    const formData = new FormData(form);
    newBook = createBookFromForm(formData);
  } catch (error) {
    showTemporaryError(error);
    return;
  }

  if (state.status !== 'success') return;

  try {
    const savedBook = await saveBook(newBook); // сервер присвоил id
    catalog.addBook(savedBook);
    state = { status: 'success', data: [...state.data, savedBook] };
    form.reset();
    render();
  } catch (error) {
    showTemporaryError(error); // список не трогаем
    render();
  }
});

// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', updateView);
searchInput.addEventListener('input', updateView);
sortBySelect.addEventListener('change', updateView);