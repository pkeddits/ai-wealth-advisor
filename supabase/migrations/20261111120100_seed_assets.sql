-- Catálogo inicial de ativos. Não contém preços: cotações virão de uma fonte de mercado.
insert into public.assets (symbol, name, asset_class, sector, exchange) values
  ('PETR4', 'Petrobras PN', 'acoes', 'Petróleo e gás', 'B3'),
  ('VALE3', 'Vale ON', 'acoes', 'Mineração', 'B3'),
  ('ITUB4', 'Itaú Unibanco PN', 'acoes', 'Bancos', 'B3'),
  ('WEGE3', 'WEG ON', 'acoes', 'Bens industriais', 'B3'),
  ('MXRF11', 'Maxi Renda FII', 'fiis', 'Papel', 'B3'),
  ('HGLG11', 'CSHG Logística FII', 'fiis', 'Logística', 'B3'),
  ('BOVA11', 'iShares Ibovespa ETF', 'etfs', 'Índice', 'B3'),
  ('IVVB11', 'iShares S&P 500 ETF', 'internacional', 'Índice', 'B3'),
  ('SELIC29', 'Tesouro Selic 2029', 'renda_fixa', 'Título público', 'Tesouro Direto')
on conflict (symbol) do nothing;
