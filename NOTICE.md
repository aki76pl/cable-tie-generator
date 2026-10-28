# Informacje o prawach autorskich — Generator Opasek

Copyright © 2026 aki76pl (https://github.com/aki76pl)

Kod źródłowy tego projektu jest udostępniony na licencji MIT. Pełny tekst licencji znajduje się w pliku [LICENSE](LICENSE).

## Wygenerowane modele

Pliki STL i 3MF tworzone programem są wynikiem jego działania na Twoich parametrach. Możesz je drukować, modyfikować, udostępniać i sprzedawać bez ograniczeń, także komercyjnie. Podanie źródła jest mile widziane, ale nie jest wymagane.

## Inspiracje i źródła

- Domyślne wymiary opaski (długość, szerokość, rozstaw oczek) dobrano na podstawie pomiarów modelu „Corpo” autorstwa **OfficineCasperLAB**, udostępnionego na licencji *Standard Digital File License*. Repozytorium **nie zawiera** tego pliku ani jego siatki: geometria jest w całości generowana przez program od zera. Prawa do oryginalnego modelu należą do jego autora.
- Układ interfejsu (panel parametrów + podgląd 3D na żywo) zainspirowała strona [bento3d.design/tray](https://bento3d.design/tray). Nie skopiowano z niej kodu ani grafik.

## Komponenty zewnętrzne

Program korzysta z bibliotek open source. Należą one do swoich autorów i są rozpowszechniane na ich licencjach:

| Biblioteka | Licencja | Zastosowanie |
|---|---|---|
| [three.js](https://github.com/mrdoob/three.js) | MIT | podgląd 3D |
| [manifold-3d](https://github.com/elalish/manifold) | Apache-2.0 | obliczanie bryły (WASM) |
| [Electron](https://github.com/electron/electron) | MIT | aplikacja na Windows (zawiera Chromium; licencje w pliku `LICENSES.chromium.html` obok programu) |
| [Vite](https://github.com/vitejs/vite) | MIT | budowanie wersji web |
| [electron-builder](https://github.com/electron-userland/electron-builder) | MIT | instalator i wersja portable |

Pełne teksty licencji znajdziesz w repozytoriach tych projektów i w katalogu `node_modules` po `npm install`.
