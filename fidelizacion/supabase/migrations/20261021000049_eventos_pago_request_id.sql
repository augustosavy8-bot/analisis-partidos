-- El webhook busca si ya recibió cada aviso (x-request-id + data.id) antes de guardarlo.
create index if not exists eventos_pago_request_idx on public.eventos_pago (x_request_id, data_id);
