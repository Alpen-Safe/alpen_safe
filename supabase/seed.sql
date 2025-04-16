-- !!!                                                                                           !!!
-- !!!            DO NOT EVER ACCIDENTALLY RUN THIS FILE IN YOUR PRODUCTION DATABASE             !!!
-- !!!    this is meant for running locally to seed your database for contributing purposes      !!!

-- create local users (insiders)
-- test@test.com / password
INSERT INTO auth.users ( instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES 
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'test@test.com', crypt('password', gen_salt('bf')), current_timestamp, current_timestamp, current_timestamp, '{"provider":"email","providers":["email"]}', '{}', current_timestamp, current_timestamp, '', '', '', '');


-- test user email identity
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES 
  (uuid_generate_v4(), (SELECT id FROM auth.users WHERE email = 'test@test.com'), format('{"sub":"%s","email":"%s"}', (SELECT id FROM auth.users WHERE email = 'test@test.com')::text, 'test@test.com')::jsonb, 'email', uuid_generate_v4(), current_timestamp, current_timestamp, current_timestamp);


INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) VALUES ('00000000-0000-0000-0000-000000000000', '0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', 'authenticated', 'authenticated', 'dan@dan.com', '$2a$10$3XHaeea.TlutwsKtEhONx.3xlg4AJ1H94qzVPFTQa3Lh.Z0h29iDS', '2025-04-15 12:22:56.126172+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-04-15 12:22:56.192614+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3", "email": "dan@dan.com", "email_verified": true, "phone_verified": false}', NULL, '2025-04-15 12:22:56.122892+00', '2025-04-15 12:22:56.193376+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES ('0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', '0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', '{"sub": "0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3", "email": "dan@dan.com", "email_verified": false, "phone_verified": false}', 'email', '2025-04-15 12:22:56.124587+00', '2025-04-15 12:22:56.124606+00', '2025-04-15 12:22:56.124606+00', '00cce831-3360-4b7c-90ae-8db406111ee1');


-- end seed users

--
-- Data for Name: multi_sig_wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.multi_sig_wallets (id, name, m, n, chain, server_signers, wallet_descriptor, created_at, updated_at) VALUES ('2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'Asd', 2, 3, 'bitcoin', 1, 'wsh(multi(2,tpubDFhMD9c8J9zf4wZ8tpecdGw9KuLNPgWLe1Rukynq1Yw7QMDBXnbnErK3xbsz8srUoBvDQ9w3ZhMy4yW12MWKrWov39cQ1ubRQbDxnj2MmTQ/0/*,tpubDFRzvugMc1gKy96y5Kt4fRN44aEgHTWEc4wH8Dt7wq5JkKVz4NyMW8Wut2WY2JX6fNYL5TuHBVywZwXBBreA75TE53QnLMHbuSEtAdxX1as/0/*,tpubDEvN39G5h5VauvQpq3wvkzQo3fSvf1kbKvd9Y6JSVrKSsdAEXH7ysV2D1DGwdS6KSB7GeKXSmhFkHru3mugDgSJQ2eay5jnQmHHJfsgvafu/0/*))', '2025-04-15 12:24:21.378627+00', '2025-04-15 12:24:21.378627+00');


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (1, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1q5tkthrfk3kalrdfgrz4jvk6mp4z55xtdthmkevqyv793uwst0szs7nyr36', 0, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (2, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qt9cjangckpysg37g58235k9ysphvnryhnv9dn6eea6ae8mtz3g5q8usv8w', 1, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (3, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qsg4hjxx4jqmg53cxq7l3qfxugradxpprh3gll6c0ukde5fs4p7gqg7e75t', 2, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (4, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qrd6kl5vg2t9lsvqd83vxu4tum3fcrm4axfx0ulladvdqpakwplws2j5u0x', 3, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (5, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1q6phm9d9q86ulh6zkga6hkgnsuadlyz5ppf0w4kxyaqaxkrxmfevq8em67q', 4, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (6, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qyzx0v75wn758jerm7qzcmqm6lcgcxth4tate0fhr7a74gq4uph8qlvavne', 5, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (7, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qkwwm7cc3kgdxwkdekydjk8xlsvjlefryzv089x9ym0657v2hdwxqcj08pj', 6, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (8, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qrepedf2xz009eksy285lw6au2e30lev3yxq4htnwhq6kgdlpzw7sge4m94', 7, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (9, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qcfygcmwdpn4mah0tnh47lgzeyemw8tyjwqj8mh5qstuydmurxj8qpfyw7e', 8, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (10, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qajxv4jddyrtw9zjgvh3p3h6syf0pytgdca2kemj4pqsgnjwafxksz57tad', 9, false, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (11, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qyfl2jtn393vkcf0yu9nae79lupa3cmgehgtte0km0xymsjqujgps6277pa', 0, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (12, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qa5jh5j8wd34c228hwuer4crpp36vyw8zzmfggefcc432p3kmas9qsmh23k', 1, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (13, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1q3jyj3q6zhrcx3upvsnf90uz5fkp3tccq39dny4zqesjlsj46ulzs8tqkzj', 2, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (14, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1q0ta29s67yvd4urh560vpa2wqacj45at7kltl7pg4xt4ksq7rp4ys2yls7f', 3, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (15, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1q0ylas8x84qsyy2ysktk99f9j4jj0pn36tgauvxt5vfskrdypgnmsg9gt5u', 4, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (16, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qh6s8262g99pfjy4y7ne4qfv9alm7qh06tyrhgdagx35ulnsl743sccyudh', 5, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (17, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qmmt27c4et0xggua0ha5hrehqmwmn0ckeu0wjgg5p7g89rr84mlnsjj5usw', 6, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (18, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qvxfu0scnqcale2vtk72r4cdkgkf6r2vm3gya37lvy3flp08f89vqdkcpqe', 7, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (19, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qxd52v87nsh73sr0qcfrxw258s45jwntlrm57n28m5prspsqhs0sqpu3psm', 8, true, '2025-04-15 12:24:21.442685+00', false);
INSERT INTO public.addresses (id, wallet_id, address, address_index, change, created_at, is_used) VALUES (20, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'tb1qefx97vjzltajcfzlmwx0wxm7sqy5dduns6vps6tpwr7fuz0tfxfq554m6e', 9, true, '2025-04-15 12:24:21.442685+00', false);


--
-- Data for Name: public_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.public_keys (id, user_id, xpub, account_node_derivation_path, device, created_at, label) VALUES (1, '0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', 'tpubDFRzvugMc1gKy96y5Kt4fRN44aEgHTWEc4wH8Dt7wq5JkKVz4NyMW8Wut2WY2JX6fNYL5TuHBVywZwXBBreA75TE53QnLMHbuSEtAdxX1as', 'm/48''/1''/0''/2''', 'ledger', '2025-04-15 12:24:21.378627+00', 'Safe Key');
INSERT INTO public.public_keys (id, user_id, xpub, account_node_derivation_path, device, created_at, label) VALUES (2, '0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', 'tpubDEvN39G5h5VauvQpq3wvkzQo3fSvf1kbKvd9Y6JSVrKSsdAEXH7ysV2D1DGwdS6KSB7GeKXSmhFkHru3mugDgSJQ2eay5jnQmHHJfsgvafu', 'm/48''/1''/1''/2''', 'ledger', '2025-04-15 12:24:21.378627+00', 'Home Key');


--
-- Data for Name: server_signers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.server_signers (account_id, created_at, wallet_id, account_node_derivation_path, xpub) VALUES (1, '2025-04-15 12:24:21.368142+00', '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', 'm/48''/1''/1''/2''', 'tpubDFhMD9c8J9zf4wZ8tpecdGw9KuLNPgWLe1Rukynq1Yw7QMDBXnbnErK3xbsz8srUoBvDQ9w3ZhMy4yW12MWKrWov39cQ1ubRQbDxnj2MmTQ');


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: utxos; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transaction_inputs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: transaction_outputs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_signers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_signers (public_key_id, wallet_id) VALUES (1, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e');
INSERT INTO public.user_signers (public_key_id, wallet_id) VALUES (2, '2a026c92-5ea6-4d1e-b10a-dda384ea9b7e');


--
-- Data for Name: wallet_owners; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.wallet_owners (wallet_id, user_id, role) VALUES ('2a026c92-5ea6-4d1e-b10a-dda384ea9b7e', '0c36d1ff-ebb9-4689-b182-9ca8bf5e5bd3', 'admin');


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.addresses_id_seq', 20, true);


--
-- Name: public_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.public_keys_id_seq', 2, true);


--
-- Name: server_signers_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.server_signers_account_id_seq', 1, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: utxos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.utxos_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

