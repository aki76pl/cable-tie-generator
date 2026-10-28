# Generator Opasek

Parametryczny generator wielorazowych opasek do kabli (do druku 3D, najlepiej z TPU) z podglądem 3D na żywo. Działa jako aplikacja na Windows 11 i jako strona w przeglądarce.

Opaska to płaski pasek z rzędem oczek i grzybkowym kołkiem przy jednym końcu. Owijasz nią kable, wciskasz kołek w wybrane oczko i gotowe. Drukuje się bez podpór.

## Pobieranie

- **Windows:** gotowe pliki są w zakładce [Releases](../../releases): instalator `GeneratorOpasek-x.y.z-setup.exe` albo wersja przenośna `GeneratorOpasek-x.y.z-portable.exe`, która nie wymaga instalacji.
- **Przeglądarka:** <https://aki76pl.github.io/cable-tie-generator/>

> Aplikacja nie ma podpisu cyfrowego, więc przy pierwszym uruchomieniu Windows SmartScreen może wyświetlić ostrzeżenie. Kliknij „Więcej informacji” → „Uruchom mimo to”.

## Parametry

| Grupa | Parametr | Domyślnie |
|---|---|---|
| Pasek | długość / szerokość / grubość | 150 / 15 / 2 mm |
| Pasek | kształt wolnego końca | okrągły, szpic, prosty |
| Oczka | ilość | 10 |
| Oczka | długość × szerokość oczka | 4 × 8 mm |
| Oczka | rozstaw (środek–środek) | 8,5 mm |
| Oczka | zaokrąglenie narożników, odstęp od końca | 1 mm, 6 mm |
| Kołek | luz szyjki, wysokość czapki, nawis czapki | 0,2 / 2 / 0,8 mm |
| Wydruk | ilość sztuk na stole | 1 |

Gdy oczek jest więcej, niż mieści się na danej długości, program sam ograniczy ich liczbę i wyświetli ostrzeżenie. Wymiary kołka liczą się z wymiarów oczka, więc kołek zawsze pasuje do oczek.

Eksport: **STL** (binarny) oraz **3MF**. Siatka jest zawsze szczelna (manifold), bo bryłę liczy biblioteka [manifold-3d](https://github.com/elalish/manifold).

## Wskazówki do druku

- Materiał: TPU 95A (opaska musi się wyginać, żeby kołek przeszedł przez oczko).
- Druk płasko, kołkiem do góry, bez podpór.
- Jeśli zapięcie jest za luźne, zmniejsz *luz szyjki* albo zwiększ *nawis czapki*; jeśli za ciasne — odwrotnie.

## Rozwój

```bash
npm install
npm run dev        # wersja web z przeładowaniem na żywo
npm run electron   # aplikacja desktopowa
npm run dist       # instalator + wersja portable w folderze release/
```

Stos: Vite, Three.js (podgląd), manifold-3d (WASM, geometria), Electron + electron-builder (aplikacja Windows).

Nowe wydanie: `git tag v1.0.1 && git push --tags` — GitHub Actions zbuduje pliki .exe i dołączy je do Release.

## Prawa autorskie i licencja

Copyright © 2026 aki76pl. **Wszelkie prawa zastrzeżone.** Kod jest publiczny do wglądu, ale nie jest open source.

- **Wolno:** przeglądać kod, uruchamiać program i drukować wygenerowane modele na własny, niekomercyjny użytek.
- **Nie wolno** bez pisemnej zgody autora: zmieniać programu, rozpowszechniać go ani wygenerowanych modeli, ani używać ich komercyjnie (w tym sprzedawać modeli i wydruków).

Pełne warunki są w pliku [LICENSE](LICENSE). Inspiracje, źródła wymiarów i licencje użytych bibliotek opisuje plik [NOTICE.md](NOTICE.md).
