-- Seed: 2 filial, kassalar, operatorlar, xizmat turlari
-- Idempotent: branches bo'sh bo'lmasa hech narsa qilmaydi.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM branches) THEN
    RAISE NOTICE 'Seed o''tkazib yuborildi: branches allaqachon to''ldirilgan';
    RETURN;
  END IF;

  -- Xizmat turlari (realistik o'rtacha xizmat vaqtlari)
  INSERT INTO service_types (service_type_id, name, avg_service_time_sec, priority) VALUES
    (1, 'To''lovlar',                240, 0),   -- kommunal, byudjet to'lovlari (~4 daq)
    (2, 'Pul o''tkazmalari',         300, 0),   -- (~5 daq)
    (3, 'Plastik karta',             420, 0),   -- ochish/almashtirish (~7 daq)
    (4, 'Kredit',                    600, 1),   -- konsultatsiya + hujjat (~10 daq)
    (5, 'Ma''lumot / konsultatsiya', 180, 0);   -- (~3 daq)

  -- Filiallar
  INSERT INTO branches (branch_id, name, code, address, open_time, close_time) VALUES
    (1, 'Toshkent Markaziy filiali', 'TAS-01', 'Toshkent sh., Amir Temur ko''chasi 1', '09:00', '18:00'),
    (2, 'Chilonzor filiali',         'CHI-02', 'Toshkent sh., Chilonzor tumani, Bunyodkor sh. 5', '09:00', '18:00');

  -- Kassalar: 1-filial (6 ta), 2-filial (5 ta)
  INSERT INTO counters (branch_id, number, name, is_active, supported_service_types) VALUES
    (1, 1, 'Kassa 1 — to''lovlar',        TRUE,  '{1,2}'),
    (1, 2, 'Kassa 2 — to''lovlar',        TRUE,  '{1,2}'),
    (1, 3, 'Kassa 3 — plastik karta',     TRUE,  '{3}'),
    (1, 4, 'Kassa 4 — kredit',            TRUE,  '{4}'),
    (1, 5, 'Kassa 5 — ma''lumot',         TRUE,  '{5,1}'),
    (1, 6, 'Kassa 6 — universal (zaxira)',FALSE, '{1,2,3,4,5}'),
    (2, 1, 'Kassa 1 — to''lovlar',        TRUE,  '{1,2}'),
    (2, 2, 'Kassa 2 — to''lovlar',        TRUE,  '{1,2}'),
    (2, 3, 'Kassa 3 — karta/kredit',      TRUE,  '{3,4}'),
    (2, 4, 'Kassa 4 — ma''lumot',         TRUE,  '{5,1}'),
    (2, 5, 'Kassa 5 — universal (zaxira)',FALSE, '{1,2,3,4,5}');

  -- Operatorlar: 1-filial (8 ta), 2-filial (6 ta)
  INSERT INTO operators (branch_id, name, skill_set, hire_date) VALUES
    (1, 'Dilnoza Karimova',    '{1,2}',       '2021-03-15'),
    (1, 'Aziz Rahimov',        '{1,2}',       '2022-06-01'),
    (1, 'Malika Yusupova',     '{3}',         '2020-11-10'),
    (1, 'Jasur Toshpulatov',   '{4}',         '2019-02-20'),
    (1, 'Nigora Abdullayeva',  '{5,1}',       '2023-01-09'),
    (1, 'Sherzod Ergashev',    '{1,2,3,4,5}', '2018-07-01'),
    (1, 'Kamola Nazarova',     '{1,2,5}',     '2022-09-12'),
    (1, 'Bekzod Islomov',      '{3,4}',       '2021-05-03'),
    (2, 'Gulnora Sattorova',   '{1,2}',       '2020-04-18'),
    (2, 'Otabek Qodirov',      '{1,2}',       '2023-03-27'),
    (2, 'Zilola Mirzayeva',    '{3,4}',       '2021-08-30'),
    (2, 'Farrux Usmonov',      '{5,1}',       '2022-12-05'),
    (2, 'Sevara Xolmatova',    '{1,2,3,4,5}', '2019-10-14'),
    (2, 'Umid Berdiyev',       '{1,2,5}',     '2024-02-01');

  -- SERIAL ketma-ketliklarni to'g'rilash (id'lar qo'lda berildi)
  PERFORM setval('service_types_service_type_id_seq', (SELECT max(service_type_id) FROM service_types));
  PERFORM setval('branches_branch_id_seq',            (SELECT max(branch_id) FROM branches));

  RAISE NOTICE 'Seed muvaffaqiyatli yuklandi';
END $$;
