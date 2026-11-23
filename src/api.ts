import type { Book } from './task1-types';

// Адрес вашего личного ресурса на сервере
const API_URL = 'https://6b03c1679e7cafb37dbf7ed7.mockapi.io/api/books';

// DTO — «транспортный» формат: что реально отдаёт сервер.
// Поля id и createdAt сервер добавляет сам — они видны во вкладке браузера.
interface BookDTO {
  id: string;
  title: string;
  author: string;
  year: number;
  rating: number;
  createdAt?: string;
}

// Маппинг: сервер -> приложение
function mapFromServer(dto: BookDTO): Book {
  return {
    id: dto.id,
    title: dto.title,
    // Book.authors — массив строк, сервер отдаёт одну строку в dto.author.
    // Пустую строку превращаем в пустой массив, чтобы не тащить [''].
    authors: dto.author ? [dto.author] : [],
    year: dto.year,
    rating: dto.rating,
  };
}

// Маппинг: приложение -> сервер (готово, не менять)
function mapToServer(book: Book): BookDTO {
  return {
    id: book.id,
    title: book.title,
    author: book.authors[0] ?? '',
    year: book.year,
    rating: book.rating,
  };
}

// Загрузка книг: настоящий GET-запрос к серверу
export async function fetchBooks(): Promise<Book[]> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const dtos: BookDTO[] = await response.json();
  return dtos.map(mapFromServer);
}

// Создание книги: POST-запрос одной записи
export async function saveBook(book: Book): Promise<Book> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mapToServer(book)),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const dto: BookDTO = await response.json();
  return mapFromServer(dto);
}

// Удаление книги: DELETE-запрос по адресу записи
export async function deleteBook(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}
