-- ============================================================
-- APTAMA SEED: DAFTAR 50 ANGGOTA
-- Jalankan query ini di Supabase SQL Editor untuk memasukkan
-- seluruh daftar anggota sekaligus tanpa duplikasi nama.
-- ============================================================

INSERT INTO public.members (name, "group")
SELECT m.name, m.group
FROM (
  VALUES
    ('Adi Surya Hidayat', 'Anggota'),
    ('Andi Dwi Hartono', 'Anggota'),
    ('Angger Tri Saputra', 'Anggota'),
    ('Annasya Fakhrun Nisa', 'Anggota'),
    ('Annisa Tri Wulandari', 'Anggota'),
    ('Arventa Febriansyah', 'Anggota'),
    ('Athania Sabila Azarine', 'Anggota'),
    ('Dai Muhammad Febri', 'Anggota'),
    ('Danu Hikmawan', 'Anggota'),
    ('Dian Retno Utari', 'Anggota'),
    ('Dika Aditiya', 'Anggota'),
    ('Dita Anggia Nauli', 'Anggota'),
    ('Elang Dias Prakoso', 'Anggota'),
    ('Evan Lauda Tama', 'Anggota'),
    ('Fadhel Eki Sabrina', 'Anggota'),
    ('Fadhila Dewi R.', 'Anggota'),
    ('Fadzil Arya Gatta', 'Anggota'),
    ('Firza Suryagusta', 'Anggota'),
    ('Galih Adji Pratama', 'Anggota'),
    ('Hayfani Nur Pratiwi', 'Anggota'),
    ('Heri Dwi Krisnanto', 'Anggota'),
    ('Jenni Putri Ardani', 'Anggota'),
    ('Khoirunnisa Syifa M.', 'Anggota'),
    ('Layana Salsabila P.', 'Anggota'),
    ('Layli Fitri Rachmawati', 'Anggota'),
    ('Muhammad Faiz', 'Anggota'),
    ('Muhammad Fajar Husein', 'Anggota'),
    ('Mutia Hatta Khasanah', 'Anggota'),
    ('Nasrulloh Ma''ruf', 'Anggota'),
    ('Nisaur Rohmah', 'Anggota'),
    ('Nurika Asti Ananta', 'Anggota'),
    ('Putri Dwi W.', 'Anggota'),
    ('Rafel Yoesfi Syabrina', 'Anggota'),
    ('Raihan Purwaka', 'Anggota'),
    ('Rany Mazidatul M.', 'Anggota'),
    ('Rifa''at ''Alim', 'Anggota'),
    ('Rizki Akbar', 'Anggota'),
    ('Rizki Yudha', 'Anggota'),
    ('Saka Cahya W.', 'Anggota'),
    ('Salwa Hamdun Hanifah', 'Anggota'),
    ('Satwika Satya Reswara', 'Anggota'),
    ('Surono', 'Anggota'),
    ('Syifa Badiyatus S.', 'Anggota'),
    ('Syifa Rahmawati', 'Anggota'),
    ('Tri Yulianto', 'Anggota'),
    ('Yunita Widyastutik', 'Anggota'),
    ('Zainul Danu Wijaya', 'Anggota'),
    ('Zaki Maulana', 'Anggota'),
    ('Zalfa Suci Qurrotu Aini', 'Anggota'),
    ('Zidan Bayu Putranta', 'Anggota')
) AS m(name, "group")
WHERE NOT EXISTS (
  SELECT 1 FROM public.members existing
  WHERE LOWER(TRIM(existing.name)) = LOWER(TRIM(m.name))
);
