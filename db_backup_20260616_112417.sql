--
-- PostgreSQL database dump
--

\restrict 6ayyEs4yOCJc0YhJyhVLP51eXcb1rR4lIUhpdiBdnOPy3Ms28Uk9qAfgdRv8RAB

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: enum_Sheets_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_Sheets_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE public."enum_Sheets_status" OWNER TO postgres;

--
-- Name: enum_SyncJobs_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_SyncJobs_status" AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCESS',
    'FAILED',
    'SKIPPED'
);


ALTER TYPE public."enum_SyncJobs_status" OWNER TO postgres;

--
-- Name: enum_SyncJobs_syncType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_SyncJobs_syncType" AS ENUM (
    'AUTO',
    'MANUAL'
);


ALTER TYPE public."enum_SyncJobs_syncType" OWNER TO postgres;

--
-- Name: enum_attendance_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_attendance_status AS ENUM (
    'Present',
    'Absent',
    'Late'
);


ALTER TYPE public.enum_attendance_status OWNER TO postgres;

--
-- Name: enum_notifications_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_notifications_category AS ENUM (
    'SCHEDULE',
    'ATTENDANCE',
    'REMINDER'
);


ALTER TYPE public.enum_notifications_category OWNER TO postgres;

--
-- Name: enum_students_gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_students_gender AS ENUM (
    'Male',
    'Female',
    'Others'
);


ALTER TYPE public.enum_students_gender OWNER TO postgres;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_role AS ENUM (
    'ADMIN',
    'STUDENT'
);


ALTER TYPE public.enum_users_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Settings" (
    key character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Settings" OWNER TO postgres;

--
-- Name: Sheets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sheets" (
    id uuid NOT NULL,
    "sheetName" character varying(255) NOT NULL,
    "sheetId" character varying(255) NOT NULL,
    "batchId" uuid NOT NULL,
    "sectionId" uuid NOT NULL,
    status public."enum_Sheets_status" DEFAULT 'inactive'::public."enum_Sheets_status" NOT NULL,
    "lastSuccessfulSyncTime" timestamp with time zone,
    "lastAttemptedSyncTime" timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."Sheets" OWNER TO postgres;

--
-- Name: SyncJobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SyncJobs" (
    id uuid NOT NULL,
    "sheetId" uuid NOT NULL,
    "syncType" public."enum_SyncJobs_syncType" NOT NULL,
    "scheduledTime" timestamp with time zone,
    "startTime" timestamp with time zone,
    "endTime" timestamp with time zone,
    status public."enum_SyncJobs_status" DEFAULT 'PENDING'::public."enum_SyncJobs_status" NOT NULL,
    "retryCount" integer DEFAULT 0,
    "failureDetails" text,
    "lastAttemptTime" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public."SyncJobs" OWNER TO postgres;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    "studentId" integer NOT NULL,
    "subjectId" integer NOT NULL,
    date date NOT NULL,
    status public.enum_attendance_status DEFAULT 'Absent'::public.enum_attendance_status NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "sheetId" uuid
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    user_id character varying(36),
    "timestamp" timestamp with time zone NOT NULL,
    endpoint text NOT NULL,
    method character varying(10) NOT NULL,
    route text NOT NULL,
    client_ip character varying(45) NOT NULL,
    request_headers jsonb,
    authorization_header text,
    response_status integer,
    icp_hash character varying(64),
    status jsonb,
    client_agent text,
    request_body jsonb,
    remote_user text,
    audit_event_type character varying(50) DEFAULT 'audit'::character varying NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: COLUMN audit_logs.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.user_id IS 'Reference to user who performed action (UUID string)';


--
-- Name: batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.batches (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    abbreviation character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.batches OWNER TO postgres;

--
-- Name: faculties; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faculties (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.faculties OWNER TO postgres;

--
-- Name: lecturers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lecturers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    contact character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.lecturers OWNER TO postgres;

--
-- Name: lecturers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lecturers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.lecturers_id_seq OWNER TO postgres;

--
-- Name: lecturers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lecturers_id_seq OWNED BY public.lecturers.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    category public.enum_notifications_category NOT NULL,
    "targetUserId" integer,
    "isRead" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: routines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routines (
    id integer NOT NULL,
    "sectionId" uuid NOT NULL,
    "dayOfWeek" character varying(255) NOT NULL,
    "subjectCode" character varying(255) NOT NULL,
    "subjectName" character varying(255) NOT NULL,
    "startTime" character varying(255) NOT NULL,
    "endTime" character varying(255) NOT NULL,
    block character varying(255),
    room character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    teacher character varying(255),
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.routines OWNER TO postgres;

--
-- Name: routines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.routines_id_seq OWNER TO postgres;

--
-- Name: routines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routines_id_seq OWNED BY public.routines.id;


--
-- Name: sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sections (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "batchId" uuid NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.sections OWNER TO postgres;

--
-- Name: sequelize_meta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sequelize_meta (
    name character varying(255) NOT NULL
);


ALTER TABLE public.sequelize_meta OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    gender public.enum_students_gender,
    "bloodGroup" character varying(255),
    "regNum" character varying(255),
    "univId" character varying(255),
    "admissionDate" date,
    dob date,
    faculty character varying(255),
    "guardianName" character varying(255),
    "guardianContact" character varying(255),
    "userId" integer,
    "sectionId" uuid,
    "batchId" uuid,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp with time zone,
    "avatarUrl" character varying(255),
    "facultyId" uuid
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    "subjectCode" character varying(255) NOT NULL,
    "subjectName" character varying(255),
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "lecturerId" integer,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.subjects_id_seq OWNER TO postgres;

--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role public.enum_users_role DEFAULT 'STUDENT'::public.enum_users_role NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "tokenVersion" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: lecturers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturers ALTER COLUMN id SET DEFAULT nextval('public.lecturers_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: routines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines ALTER COLUMN id SET DEFAULT nextval('public.routines_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: Settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Settings" (key, value, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Sheets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Sheets" (id, "sheetName", "sheetId", "batchId", "sectionId", status, "lastSuccessfulSyncTime", "lastAttemptedSyncTime", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: SyncJobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SyncJobs" (id, "sheetId", "syncType", "scheduledTime", "startTime", "endTime", status, "retryCount", "failureDetails", "lastAttemptTime", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, "studentId", "subjectId", date, status, "createdAt", "updatedAt", "sheetId") FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, "timestamp", endpoint, method, route, client_ip, request_headers, authorization_header, response_status, icp_hash, status, client_agent, request_body, remote_user, audit_event_type) FROM stdin;
47e255e8-6dc9-4734-b103-67a8a7d09f3b	\N	2026-06-16 05:25:53.946+00	/api/health	GET	/api/health	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
0a7816ab-bc31-4355-9e03-13366dc2d37c	\N	2026-06-16 05:25:53.946+00	/api/health	GET	/api/health	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
47f3a8d2-6b3b-435e-bd80-f2471bfeb83d	\N	2026-06-16 05:25:54.065+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
a1a8096f-c602-42f5-b101-561d78e390f3	\N	2026-06-16 05:25:54.065+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
6cb7b755-4b57-457a-ac9f-77771c96632d	\N	2026-06-16 05:25:54.519+00	/api/auth/me	GET	/api/auth/me	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4Njc4OSwiZXhwIjoxNzgxNjczMTg5fQ.BTzXMRAbjrBJybaKCyoTv6m1bD0emhtjY9fmVl5ztzY", "if-none-match": "W/\\"2a1-gzyhCtkQtqy0O/483MzLO3uvWDs\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4Njc4OSwiZXhwIjoxNzgxNjczMTg5fQ.BTzXMRAbjrBJybaKCyoTv6m1bD0emhtjY9fmVl5ztzY	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
1cd3806e-6dbb-44c2-a848-49815d445729	\N	2026-06-16 05:25:54.519+00	/api/auth/me	GET	/api/auth/me	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4Njc4OSwiZXhwIjoxNzgxNjczMTg5fQ.BTzXMRAbjrBJybaKCyoTv6m1bD0emhtjY9fmVl5ztzY", "if-none-match": "W/\\"2a1-gzyhCtkQtqy0O/483MzLO3uvWDs\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4Njc4OSwiZXhwIjoxNzgxNjczMTg5fQ.BTzXMRAbjrBJybaKCyoTv6m1bD0emhtjY9fmVl5ztzY	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
d06be799-08a6-4d72-9838-4df3ddfdafdf	\N	2026-06-16 05:26:09.219+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d93a1e43-7216-4980-935a-793dedd22a51	\N	2026-06-16 05:26:09.219+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
9acb50e5-460a-4310-ae3f-30b65e10fab4	\N	2026-06-16 05:26:12.614+00	/api/health	GET	/api/health	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "*/*", "user-agent": "curl/8.5.0", "accept-encoding": "gzip", "x-forwarded-for": "2a09:bac1:36e0:5d68::10c:34", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
c8dbd1cf-9df3-40ad-ab7b-0f03f4065c25	\N	2026-06-16 05:26:12.614+00	/api/health	GET	/api/health	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "*/*", "user-agent": "curl/8.5.0", "accept-encoding": "gzip", "x-forwarded-for": "2a09:bac1:36e0:5d68::10c:34", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
f74b767b-2112-428e-81d0-55b8f9739900	\N	2026-06-16 05:26:24.409+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
bc8cb61b-83da-44a4-a64a-be944dd2bd19	\N	2026-06-16 05:26:24.409+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
85d4ddcb-2a6b-4270-b24d-4af379922713	\N	2026-06-16 05:26:24.455+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
573a9998-f128-4a9c-85a2-7867650abae9	\N	2026-06-16 05:26:24.455+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
7eb4e65b-a2db-4e43-8392-61f724d3f22e	\N	2026-06-16 05:29:27.177+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "43", "accept-encoding": "gzip", "x-forwarded-for": "2a09:bac1:3680:5d68::2a8:29", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
b40d1350-a32b-4206-bbf2-c894405a92c7	\N	2026-06-16 05:26:35.231+00	/api/chatbot/analytics	GET	/api/chatbot/analytics	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json, text/plain, */*", "referer": "http://localhost:4200/dashboard", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "close", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4", "if-none-match": "W/\\"6b3-Rc92yOjASyBTG8JNCnQllGu7hmU\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
1af6a49d-7e01-41b0-9cd0-fa07d2fd5dd3	\N	2026-06-16 05:26:35.229+00	/api/attendance/dashboard	GET	/api/attendance/dashboard	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json, text/plain, */*", "referer": "http://localhost:4200/dashboard", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "close", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4", "if-none-match": "W/\\"50c-HukKH0D2XHq7budojktcvQLl+AY\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
93ea14bf-56ad-4510-908b-f5429408b937	\N	2026-06-16 05:26:39.592+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
f00cf6c9-638d-4823-a049-348e74b5342d	\N	2026-06-16 05:26:41.107+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
8c410eea-b0c0-4838-abe2-9b51aa39d6a5	\N	2026-06-16 05:26:35.231+00	/api/chatbot/analytics	GET	/api/chatbot/analytics	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json, text/plain, */*", "referer": "http://localhost:4200/dashboard", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "close", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4", "if-none-match": "W/\\"6b3-Rc92yOjASyBTG8JNCnQllGu7hmU\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
cb6eb950-7d23-4437-9cfa-72dd7f79cd89	\N	2026-06-16 05:26:35.229+00	/api/attendance/dashboard	GET	/api/attendance/dashboard	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json, text/plain, */*", "referer": "http://localhost:4200/dashboard", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "close", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4", "if-none-match": "W/\\"50c-HukKH0D2XHq7budojktcvQLl+AY\\"", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6IkFETUlOIiwidG9rZW5WZXJzaW9uIjowLCJpYXQiOjE3ODE1MzU5MzMsImV4cCI6MTc4MTYyMjMzM30.yH0yEoo-uADx6X4-du_ydgbx_EvZfp5AEtoHw9zrem4	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
4ac87cb9-e947-47f4-ae87-2473ba7de857	\N	2026-06-16 05:26:39.592+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
00f572f8-0ef3-434e-a18f-be2ced532f51	\N	2026-06-16 05:26:41.107+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:44677", "referer": "http://localhost:44677/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
a3d76fd4-efa3-4c4e-9803-fa349fd8ee96	\N	2026-06-16 05:26:54.119+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
fc27af91-97e2-4029-b66a-463d34407596	\N	2026-06-16 05:26:54.119+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
f5f7eb2f-8ebf-4fdc-a626-88aabb0c420d	\N	2026-06-16 05:26:54.66+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
2f34c017-fe41-4f00-bf45-49cc90d4b903	\N	2026-06-16 05:26:54.66+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
aa44cffe-592e-4496-b624-7b2afd0427f8	\N	2026-06-16 05:26:54.725+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
06b3de55-e699-41a4-b65d-5cd0e88ac863	\N	2026-06-16 05:26:54.725+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
ebc47fc0-fc8e-48c6-8165-432aeb51d62c	\N	2026-06-16 05:26:55.232+00	/api/schedule/week	GET	/api/schedule/week	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
e01dc375-0154-4d0a-a687-83580e7e588f	\N	2026-06-16 05:26:55.539+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
65e6714e-1a6d-49fa-914c-18936968f154	\N	2026-06-16 05:26:55.589+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
09425f64-1b25-423a-aa15-bff01a6d46f1	\N	2026-06-16 05:26:58.441+00	/api/student/profile	GET	/api/student/profile	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
f1fcec67-3985-436e-9bfe-03a8046a441c	\N	2026-06-16 05:26:58.445+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
b05de67a-fdb1-4305-b3d8-8331d4ae3cdd	\N	2026-06-16 05:26:55.232+00	/api/schedule/week	GET	/api/schedule/week	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
0ea115a8-578f-4cbf-8f37-bfab79df959e	\N	2026-06-16 05:26:55.539+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
ae6e24bb-7bae-48c1-b03c-0fa6826669a5	\N	2026-06-16 05:26:55.589+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
8b04b932-cbe4-404f-ad4c-17c18fc77800	\N	2026-06-16 05:26:58.441+00	/api/student/profile	GET	/api/student/profile	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
dec3db07-b59e-4916-b1dd-f24a30595642	\N	2026-06-16 05:26:58.445+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
215f7d58-d47d-4792-b7b2-c8a3343467ca	\N	2026-06-16 05:27:01.808+00	/api/student/attendance/logs?page=1&limit=50	GET	/api/student/attendance/logs?page=1&limit=50	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
691b7701-2dfe-433a-a8d6-cb342590a08d	\N	2026-06-16 05:27:01.808+00	/api/student/attendance/logs?page=1&limit=50	GET	/api/student/attendance/logs?page=1&limit=50	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
a7b4ba8d-3e60-4b6d-aad9-75ffdb811c51	\N	2026-06-16 05:27:01.888+00	/api/student/attendance/summary	GET	/api/student/attendance/summary	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
7786fa21-6575-442e-96a6-5c0530989501	\N	2026-06-16 05:27:01.888+00	/api/student/attendance/summary	GET	/api/student/attendance/summary	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
71c41184-cf8e-472e-8509-b4280e747ef1	\N	2026-06-16 05:27:02.606+00	/api/schedule/week	GET	/api/schedule/week	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
f1f863ad-3a04-4d55-a94c-310b406d5b08	\N	2026-06-16 05:27:03.632+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
f0959315-d743-43dd-aca1-d21bd2ed8d94	\N	2026-06-16 05:27:04.29+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
87b18e26-1f1a-4a47-9caf-bffcf9224a9f	\N	2026-06-16 05:27:05.321+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
93ee73d9-904c-418b-a0ff-de3eeb3c2297	\N	2026-06-16 05:27:05.339+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
c626a11c-04e0-4519-bfae-610daf16b6e3	\N	2026-06-16 05:27:09.866+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
92ae0b1c-a65c-4ba7-b9cc-10183f212ed1	\N	2026-06-16 05:27:02.606+00	/api/schedule/week	GET	/api/schedule/week	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
1dfc363f-81b1-4b5c-8e6f-2d875bef7126	\N	2026-06-16 05:27:03.632+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
4fada526-3eba-4114-af68-fde13eccf6b6	\N	2026-06-16 05:27:04.29+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
9a273ee5-f746-435e-9c45-e38bd5f9be28	\N	2026-06-16 05:27:05.321+00	/api/notifications	GET	/api/notifications	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
4512381f-6b61-4a21-9b31-af286bba023c	\N	2026-06-16 05:27:05.339+00	/api/student/dashboard	GET	/api/student/dashboard	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6IlNUVURFTlQiLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4MTU4NjkzNywiZXhwIjoxNzg0MTc4OTM3fQ.xslS4q8bjrqg7fVOtGNRdHVD78U09OVoh04whs-ns4M	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
cf4ddcdd-2d20-4e6a-8e19-056d881e048f	\N	2026-06-16 05:27:09.866+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
52acdde9-101e-48bc-9cf8-488e86312a1c	\N	2026-06-16 05:27:25.008+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
16d34eac-b7c4-441a-a54a-712247fd32b7	\N	2026-06-16 05:27:25.008+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
368bc09e-1da3-4bf0-a68d-917aeb6c3ff9	\N	2026-06-16 05:27:40.158+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
7299ae4f-ba7b-4f32-a92c-5bab0a260990	\N	2026-06-16 05:27:40.158+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
211f4d03-296d-4373-b615-5e3ac0a77e97	\N	2026-06-16 05:27:45.611+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
12f974ca-2edc-4941-b264-79471fd2bb6c	\N	2026-06-16 05:27:45.611+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
3b415148-9ebd-42d5-aa71-cfa878ff9243	\N	2026-06-16 05:32:12.775+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
761f51ae-c20d-4130-9d47-74f04afabbca	\N	2026-06-16 05:27:54.468+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
10afe7ff-4415-4328-8ba6-ad037ad0397e	\N	2026-06-16 05:27:55.345+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d07aacd4-7085-4082-971c-3f731db9baa5	\N	2026-06-16 05:27:55.481+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
54ec3689-0f56-4275-852b-0ce83b611487	\N	2026-06-16 05:27:54.468+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
0b2d9fe9-1367-4305-9bd0-698e75d5e297	\N	2026-06-16 05:27:55.345+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
7636444c-2291-44df-89f3-fa890636b4fe	\N	2026-06-16 05:27:55.481+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
b7fa43fd-637e-4ba5-98c1-3c9b2a6af77b	\N	2026-06-16 05:28:10.477+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2e4173c2-d845-4c6d-b144-4aff254dc9a9	\N	2026-06-16 05:28:10.477+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
06583982-9c01-46a3-8521-5c683c5ffd16	\N	2026-06-16 05:28:25.64+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d3393e5b-6616-42ef-8ad0-c04259432955	\N	2026-06-16 05:28:25.64+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d48745fc-7abf-4235-8b5a-fc8295f0575b	\N	2026-06-16 05:28:40.778+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
f00c8d5c-e46c-428f-a153-c9f7965ceb1f	\N	2026-06-16 05:28:40.778+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
67fddb54-ca60-44ee-9383-978997363658	\N	2026-06-16 05:28:42.413+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "content-length": "87", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
134b1675-9034-4e95-b7d4-a0f25f72a98e	\N	2026-06-16 05:28:42.413+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "application/json", "user-agent": "Dart/3.8 (dart:io)", "content-type": "application/json", "content-length": "87", "accept-encoding": "gzip", "x-forwarded-for": "160.250.255.128", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	Dart/3.8 (dart:io)	\N	\N	api-access
3cf96c1d-7bcf-4228-9f04-ec144a5b7aae	\N	2026-06-16 05:28:55.933+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
8a5abfcf-dd31-42bb-8e58-763c3fe32ef2	\N	2026-06-16 05:28:55.933+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
c628eaa2-ecf8-4871-bdab-2c50f5f44154	\N	2026-06-16 05:29:11.085+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
44e5490d-c464-4aba-916d-85bf1ce44267	\N	2026-06-16 05:29:11.085+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2350aba9-34c4-4c99-876a-a428ea9842b9	\N	2026-06-16 05:29:16.755+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "43"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
2149c986-094f-431a-91a3-4ce727b89d6f	\N	2026-06-16 05:29:16.755+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "43"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
f4118d2e-9103-498e-8df0-a9a4acfb8800	\N	2026-06-16 05:29:25.807+00	/api/auth/students/list	GET	/api/auth/students/list	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
6b971915-6bae-4b25-9d5e-1d8378fab619	\N	2026-06-16 05:29:25.807+00	/api/auth/students/list	GET	/api/auth/students/list	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
0b281807-522f-480d-bbf9-6a0b63b8100e	\N	2026-06-16 05:29:26.228+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
fbc4de11-b760-45b2-8071-71c24483572d	\N	2026-06-16 05:29:26.228+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
610f44cc-ca8a-453d-bfe0-13fbeea2a604	\N	2026-06-16 05:29:27.177+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "crowbar-unpledged-coming.ngrok-free.dev", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "43", "accept-encoding": "gzip", "x-forwarded-for": "2a09:bac1:3680:5d68::2a8:29", "x-forwarded-host": "crowbar-unpledged-coming.ngrok-free.dev", "x-forwarded-proto": "https"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
f639c9c9-9aad-4d0c-939b-4eeb0573b642	\N	2026-06-16 05:29:41.371+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
b0f572cf-a2c3-463b-a97b-da4312c45c3f	\N	2026-06-16 05:29:41.371+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
6fdc3639-206e-4af5-8dd0-b2d7857431c8	\N	2026-06-16 05:29:56.515+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
765d6b01-2656-4d5a-ad62-254b7f6d430f	\N	2026-06-16 05:29:56.515+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
43c35987-0cd5-4fd8-8419-5bf560375596	\N	2026-06-16 05:29:59.039+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "52"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
1734029c-3a8a-45e1-a409-4922b2992e42	\N	2026-06-16 05:29:59.039+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "52"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
b4b732a1-2254-4bc2-a87a-c87addebe8d9	\N	2026-06-16 05:30:11.664+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
e364ba5d-e114-4c89-bff9-0a6e0e971b84	\N	2026-06-16 05:30:11.664+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
4a0abdc4-3144-44bf-b2a0-109cc7799e0b	\N	2026-06-16 05:30:20.488+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "52"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
5d7bded4-3d2c-46c5-8b7a-b9110ba30863	\N	2026-06-16 05:30:20.488+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "*/*", "user-agent": "curl/8.5.0", "content-type": "application/json", "content-length": "52"}	\N	\N	\N	\N	curl/8.5.0	\N	\N	api-access
b926da81-e665-4889-9da6-3bd967b3b51e	\N	2026-06-16 05:30:26.803+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
cf182444-372c-42cf-908e-4459b312e2cb	\N	2026-06-16 05:30:26.803+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
397559c3-fbea-44a3-ae0a-93e02e6f782c	\N	2026-06-16 05:30:41.948+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
8b7c2ecb-0572-4af7-abee-e4daa8a838d2	\N	2026-06-16 05:30:41.948+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
25f3179f-2ad2-4126-b5af-0a83625e16ef	\N	2026-06-16 05:30:57.091+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
0933d25f-4adc-435b-9a0a-4b2dba1fbaa0	\N	2026-06-16 05:30:57.091+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
41a1926f-1284-41e5-aace-be7bd02c99fa	\N	2026-06-16 05:31:12.227+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d44d7d12-17c2-429f-b64f-6850ceaf5812	\N	2026-06-16 05:31:12.227+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
8938da0e-b92c-445f-8476-f3738b1c7446	\N	2026-06-16 05:31:27.36+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
e6e464d4-ed6d-420a-b35d-c70304c5835a	\N	2026-06-16 05:31:27.36+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
438e7ba9-c71d-48fa-a9b8-0db1e40bde84	\N	2026-06-16 05:31:42.497+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
e748896f-e10a-4946-ac40-e009c7b1de66	\N	2026-06-16 05:31:42.497+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
c94ceb26-b53a-47c2-8290-a030b6474fc5	\N	2026-06-16 05:31:57.632+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
163d06a7-396a-4e09-a567-9be09cd68ef9	\N	2026-06-16 05:31:57.632+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
63256643-7ec0-420b-8911-6818f4ea9849	\N	2026-06-16 05:32:12.775+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
6ad20d04-8983-419b-a53b-28ffad2e4e09	\N	2026-06-16 05:32:27.911+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
4f59ba1c-728d-4599-9484-7ff1451f3f37	\N	2026-06-16 05:32:27.911+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2365aca0-09b5-4a13-aa1a-3d01feb3ace1	\N	2026-06-16 05:32:43.045+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
312a4541-de25-48ce-a274-6c30bb7034b9	\N	2026-06-16 05:32:43.045+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
fc3e965a-06ad-46d7-9d04-aeff4d034b64	\N	2026-06-16 05:32:58.181+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
f350cbc0-2449-4760-bbe6-faefbc93a763	\N	2026-06-16 05:32:58.181+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
8dae55e1-a018-4332-ad17-4ab37103ee6a	\N	2026-06-16 05:33:13.315+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
60fd74e8-7e31-4eb2-9dcc-dccad9b31058	\N	2026-06-16 05:33:13.315+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
68526d84-11be-4d55-a9ed-1784933384dc	\N	2026-06-16 05:33:28.452+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
48485fb9-154c-45fe-85d6-b5221541f26a	\N	2026-06-16 05:33:28.452+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
56474273-b81a-49da-af9a-3c8447f44437	\N	2026-06-16 05:33:43.582+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
5ca0bd75-02d8-49fb-9b55-a9ef6cf02050	\N	2026-06-16 05:33:43.582+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
1d3e2a60-458a-4618-8407-5e36d01900ae	\N	2026-06-16 05:33:58.717+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2dd9f6e4-5889-4adb-b456-dd4d58e96cc9	\N	2026-06-16 05:33:58.717+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
85f7cfec-7332-4810-84b8-d5ea0650e2ab	\N	2026-06-16 05:34:13.848+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
455e606f-5458-4025-ade8-86429b3fd2ab	\N	2026-06-16 05:34:13.848+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
48a6ea5c-ec4f-4df9-ab34-f160b2bea4af	\N	2026-06-16 05:34:28.979+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d39d18cb-d9c9-47cb-803d-98c02743ad9d	\N	2026-06-16 05:34:28.979+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
ab6ec55b-d2d5-468a-8d16-a8896f4efb9a	\N	2026-06-16 05:34:44.116+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
5083629d-df06-4ab3-b52b-edc5a5cf796c	\N	2026-06-16 05:34:44.116+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
577e14a1-5d78-44f4-8597-a84fa0a53aae	\N	2026-06-16 05:34:59.256+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
049edb27-50be-4c2f-ace1-492e5369f212	\N	2026-06-16 05:34:59.256+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
9231880f-fadd-4505-926b-2e51c5e65933	\N	2026-06-16 05:35:14.387+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
5dcc9975-87be-47f8-8e86-39e998d67d2d	\N	2026-06-16 05:35:14.387+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
69b50960-2ea8-4a06-86c3-fffa0afc898c	\N	2026-06-16 05:35:29.528+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
c7d8f9e6-723f-4887-81f9-1cd3dbc719f8	\N	2026-06-16 05:35:29.528+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
c38907dd-9246-4847-9fc8-44869f82ef36	\N	2026-06-16 05:35:44.658+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
14df8e96-d052-40c9-8846-1aff86291c8b	\N	2026-06-16 05:35:44.658+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
ebc2b07d-3921-43f5-ac55-571ad8481e78	\N	2026-06-16 05:35:59.791+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d6522457-2094-4524-9066-76aea296f27f	\N	2026-06-16 05:35:59.791+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2c9d4136-4e30-451c-85e3-446d980fc8be	\N	2026-06-16 05:36:14.929+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
f04a4902-9139-4f36-a3fd-05f95d72b718	\N	2026-06-16 05:36:14.929+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
78b33e60-007a-4143-9aee-1002d8c86cb9	\N	2026-06-16 05:36:30.07+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
2aa03d65-10d3-4ff4-920c-aa010addc42c	\N	2026-06-16 05:36:30.07+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
b23884e2-8e07-49b4-ac5a-c82454b6cd81	\N	2026-06-16 05:36:45.206+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
3b27ed41-a9ba-419a-8c85-3d5037b65b56	\N	2026-06-16 05:36:45.206+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
de72e360-d239-44a6-8b28-33804626e191	\N	2026-06-16 05:36:53.114+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
03dc6afc-1fd1-415c-9f61-99c2e8acb840	\N	2026-06-16 05:36:53.114+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
a79db4b7-0bd2-4f31-88ed-35a438afb6df	\N	2026-06-16 05:36:53.917+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
ed8fdb4c-714a-4b6f-83e2-4ae368249c32	\N	2026-06-16 05:36:53.917+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
8cc9298e-59b1-4482-a9fd-677599ddbdfb	\N	2026-06-16 05:36:54.218+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
daf862e7-b5b3-4f9d-9e44-152f4c81922c	\N	2026-06-16 05:36:54.549+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
6bb484b3-94ef-4466-8dc3-59de89604a48	\N	2026-06-16 05:37:00.34+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
54436bed-ec7f-4834-98de-a57b22c8f13f	\N	2026-06-16 05:37:11.253+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "88", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
9a2b1149-944b-4deb-b428-be5a92fe6a95	\N	2026-06-16 05:37:11.253+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "88", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
6e7d2d18-4d46-44eb-879c-9be4a1a6c9af	\N	2026-06-16 05:37:15.482+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
aa323699-7491-4701-81dd-9def1a618b14	\N	2026-06-16 05:37:15.482+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
6c35eb62-ac36-45f0-9c7f-3b62aa9b0aa1	\N	2026-06-16 05:37:30.622+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
23750198-3f4e-4075-809b-e9668fe276fb	\N	2026-06-16 05:37:30.622+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
b8e193c7-6445-4466-b5e7-9035c8feb597	\N	2026-06-16 05:37:45.757+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
f3485140-6526-4924-9e97-a791d5e7383b	\N	2026-06-16 05:37:45.757+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
c8f1ec84-4570-4d4b-a425-930f651875ae	\N	2026-06-16 05:38:00.894+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
5c0e36a7-d71d-479c-877b-89e0b4d2a65c	\N	2026-06-16 05:38:00.894+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
0b0181c8-bc7d-43a4-9d98-1470a2c88903	\N	2026-06-16 05:38:16.044+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
159465c3-eb0a-4db0-9d54-9c6248303430	\N	2026-06-16 05:38:16.044+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
d4f4bf5b-0678-47b1-bb94-5f0d9c998d9f	\N	2026-06-16 05:38:31.209+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
08959ab3-f3db-44ab-9589-90dcc85b64dc	\N	2026-06-16 05:38:31.209+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
0abc1703-426f-4f3d-a281-9049c0afe51d	\N	2026-06-16 05:38:46.345+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
ee8f31db-944c-4203-8d74-b35cc64fd6a2	\N	2026-06-16 05:38:46.345+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
e8728c83-52d5-4e44-9c52-4205d3c4b372	\N	2026-06-16 05:39:01.494+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
da1919cb-3fc3-46db-bdef-7b8710066d6d	\N	2026-06-16 05:39:01.494+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
eef65607-f762-4461-8119-6ebc7c99dd27	\N	2026-06-16 05:39:16.638+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
b5d5171f-72b7-478e-9200-697dd0a2d98f	\N	2026-06-16 05:39:16.638+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
78d7b293-0926-451d-bb36-8f0db08096d3	\N	2026-06-16 05:36:54.218+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
3d6f325a-62b4-4f6d-9008-2faa0d152530	\N	2026-06-16 05:36:54.549+00	/api/auth/login	POST	/api/auth/login	::ffff:172.21.0.1	{"host": "localhost:5001", "accept": "application/json", "origin": "http://localhost:46383", "referer": "http://localhost:46383/", "sec-ch-ua": "\\"Google Chrome\\";v=\\"147\\", \\"Not.A/Brand\\";v=\\"8\\", \\"Chromium\\";v=\\"147\\"", "connection": "keep-alive", "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36", "content-type": "application/json", "content-length": "87", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-site", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9", "sec-ch-ua-mobile": "?0", "sec-ch-ua-platform": "\\"Linux\\""}	\N	\N	\N	\N	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	\N	api-access
4a28b679-f0b2-4b5c-bad2-f9e3b5d3e034	\N	2026-06-16 05:37:00.34+00	/api/health	GET	/api/health	::ffff:127.0.0.1	{"host": "127.0.0.1:5000", "accept": "*/*", "connection": "keep-alive", "user-agent": "node", "sec-fetch-mode": "cors", "accept-encoding": "gzip, deflate", "accept-language": "*"}	\N	\N	\N	\N	node	\N	\N	api-access
\.


--
-- Data for Name: batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.batches (id, name, abbreviation, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: faculties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.faculties (id, name, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: lecturers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lecturers (id, name, email, contact, "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, title, description, category, "targetUserId", "isRead", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: routines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routines (id, "sectionId", "dayOfWeek", "subjectCode", "subjectName", "startTime", "endTime", block, room, "createdAt", "updatedAt", teacher, "deletedAt") FROM stdin;
\.


--
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sections (id, name, "batchId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: sequelize_meta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sequelize_meta (name) FROM stdin;
20260426000000-create-users.js
20260427000000-create-audit-logs.js
20260505000000-create-subjects.js
20260508000000-create-batches-and-sections.js
20260508001000-create-sheets.js
20260508002000-create-students.js
20260508003000-create-attendance.js
20260508004000-add-late-to-attendance-status.js
20260508005000-create-routines.js
20260508006000-create-notifications.js
20260509000000-add-fk-to-students.js
20260509000000-create-syncjob.js
20260518000000-create-lecturers.js
20260601000000-add-teacher-to-routines.js
20260606000000-add-lecturerId-to-subjects.js
20260607000000-add-soft-delete.js
20260611000000-add-avatarUrl-to-students.js
20260612000000-create-faculty.js
20260612000001-update-students.js
20260614000000-remove-semester.js
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (id, name, email, gender, "bloodGroup", "regNum", "univId", "admissionDate", dob, faculty, "guardianName", "guardianContact", "userId", "sectionId", "batchId", "createdAt", "updatedAt", "deletedAt", "avatarUrl", "facultyId") FROM stdin;
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subjects (id, "subjectCode", "subjectName", "createdAt", "updatedAt", "lecturerId", "deletedAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, role, "isActive", "tokenVersion", "createdAt", "updatedAt") FROM stdin;
1	admin@example.com	$2b$10$pBYQXQlELVWXnhBUnMmc8OhGGNWSgiwSG.0jREAfTLVGvznqaODAS	ADMIN	t	0	2026-06-16 05:25:40.494+00	2026-06-16 05:25:40.494+00
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 1, false);


--
-- Name: lecturers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lecturers_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: routines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routines_id_seq', 1, false);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.students_id_seq', 1, false);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.subjects_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (key);


--
-- Name: Sheets Sheets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sheets"
    ADD CONSTRAINT "Sheets_pkey" PRIMARY KEY (id);


--
-- Name: SyncJobs SyncJobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncJobs"
    ADD CONSTRAINT "SyncJobs_pkey" PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_studentId_subjectId_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_studentId_subjectId_date_unique" UNIQUE ("studentId", "subjectId", date);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (id);


--
-- Name: faculties faculties_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faculties
    ADD CONSTRAINT faculties_pkey PRIMARY KEY (id);


--
-- Name: lecturers lecturers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lecturers
    ADD CONSTRAINT lecturers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: routines routines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_pkey PRIMARY KEY (id);


--
-- Name: sections sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT sections_pkey PRIMARY KEY (id);


--
-- Name: sequelize_meta sequelize_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sequelize_meta
    ADD CONSTRAINT sequelize_meta_pkey PRIMARY KEY (name);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: Sheets_sheetId_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Sheets_sheetId_unique_active" ON public."Sheets" USING btree ("sheetId") WHERE (status = 'active'::public."enum_Sheets_status");


--
-- Name: audit_logs_audit_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_audit_event_type ON public.audit_logs USING btree (audit_event_type);


--
-- Name: audit_logs_endpoint; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_endpoint ON public.audit_logs USING btree (endpoint);


--
-- Name: audit_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: batches_abbreviation_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX batches_abbreviation_unique_active ON public.batches USING btree (abbreviation) WHERE ("deletedAt" IS NULL);


--
-- Name: batches_name_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX batches_name_unique_active ON public.batches USING btree (name) WHERE ("deletedAt" IS NULL);


--
-- Name: lecturers_email_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX lecturers_email_unique_active ON public.lecturers USING btree (email) WHERE ("deletedAt" IS NULL);


--
-- Name: sections_name_batchId_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sections_name_batchId_unique_active" ON public.sections USING btree (name, "batchId") WHERE ("deletedAt" IS NULL);


--
-- Name: students_email_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX students_email_unique_active ON public.students USING btree (email) WHERE ("deletedAt" IS NULL);


--
-- Name: students_regNum_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "students_regNum_unique_active" ON public.students USING btree ("regNum") WHERE ("deletedAt" IS NULL);


--
-- Name: students_univId_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "students_univId_unique_active" ON public.students USING btree ("univId") WHERE ("deletedAt" IS NULL);


--
-- Name: subjects_subjectCode_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "subjects_subjectCode_unique_active" ON public.subjects USING btree ("subjectCode") WHERE ("deletedAt" IS NULL);


--
-- Name: users_email_unique_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_unique_active ON public.users USING btree (email) WHERE ("isActive" = true);


--
-- Name: Sheets Sheets_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sheets"
    ADD CONSTRAINT "Sheets_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sheets Sheets_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sheets"
    ADD CONSTRAINT "Sheets_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SyncJobs SyncJobs_sheetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SyncJobs"
    ADD CONSTRAINT "SyncJobs_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES public."Sheets"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance attendance_sheetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES public."Sheets"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: attendance attendance_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public.students(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attendance attendance_subjectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT "attendance_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public.subjects(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: students fk_students_batchId; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "fk_students_batchId" FOREIGN KEY ("batchId") REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: students fk_students_sectionId; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "fk_students_sectionId" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: students fk_students_userId; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "fk_students_userId" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: routines routines_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT "routines_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.sections(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sections sections_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sections
    ADD CONSTRAINT "sections_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public.batches(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: students students_facultyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT "students_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES public.faculties(id);


--
-- Name: subjects subjects_lecturerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT "subjects_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES public.lecturers(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 6ayyEs4yOCJc0YhJyhVLP51eXcb1rR4lIUhpdiBdnOPy3Ms28Uk9qAfgdRv8RAB

