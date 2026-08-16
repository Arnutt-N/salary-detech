-- ============================================================================
-- DPIS ➔ Salary Detech: Data Pipeline & Integration SQL Views
-- Source: DPIS 192 Tables (PER_PERSONAL, PER_COMMAND, PER_COMDTL, PER_SALARYHIS, etc.)
-- Destination: Salary Detech Ingestion Pipeline
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. View: VW_DPIS_SALARY_DETECH_PERSON (แปลงข้อมูลข้าราชการปัจจุบัน)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_dpis_salary_detech_person` AS
SELECT
    p.per_id AS source_id,
    p.per_cardno AS per_cardno,
    pn.pn_name AS pn_name,
    p.per_name AS per_name,
    p.per_surname AS per_surname,
    pos.pos_no AS pos_no,
    pl.pl_name AS pos_name,
    pt.pt_name AS pt_name,
    lvl.level_no AS level_no,
    lvl.level_name AS level_name,
    org_bur.org_name AS org_name_bureau,
    org_div.org_name AS org_name_division,
    org_dep.org_name AS org_name_department,
    org_min.org_name AS org_name_ministry,
    p.per_salary AS per_salary,
    'แท่ง' AS salary_system_type,
    p.per_gender AS per_gender,
    p.per_birthdate AS per_birthdate,
    p.per_startdate AS per_startdate,
    p.per_retiredate AS per_retiredate,
    p.per_type AS per_active
FROM per_personal p
LEFT JOIN per_prename pn ON p.pn_code = pn.pn_code
LEFT JOIN per_position pos ON p.pos_id = pos.pos_id
LEFT JOIN per_line pl ON pos.pl_code = pl.pl_code
LEFT JOIN per_type pt ON pos.pt_code = pt.pt_code
LEFT JOIN per_level lvl ON p.level_no = lvl.level_no
LEFT JOIN per_org org_bur ON p.org_id = org_bur.org_id
LEFT JOIN per_org org_div ON org_bur.department_id = org_div.org_id
LEFT JOIN per_org org_dep ON org_div.department_id = org_dep.org_id
LEFT JOIN per_org org_min ON org_dep.department_id = org_min.org_id;

-- ----------------------------------------------------------------------------
-- 2. View: VW_DPIS_SALARY_DETECH_ORDER (แปลงคำสั่งและบัญชีแนบท้าย)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_dpis_salary_detech_order` AS
SELECT
    cmd.com_no AS com_no,
    cmd.com_date AS com_date,
    dtl.cmd_date AS cmd_date, -- Effective Date
    dtl.mov_code AS mov_code,
    dtl.cmd_seq AS cmd_seq,
    p.per_cardno AS per_cardno,
    
    -- New Snapshot
    dtl.cmd_salary AS cmd_salary,
    dtl.cmd_spsalary AS cmd_spsalary,
    dtl.cmd_old_salary AS cmd_old_salary,
    0.00 AS cost_of_living,
    0.00 AS pos_allowance,
    dtl.cmd_date AS salary_as_of_date,
    
    pl.pl_name AS pos_name,
    pos.pos_no AS pos_no,
    pt.pt_name AS pt_name,
    lvl.level_no AS level_no,
    lvl.level_name AS level_name,
    org_bur.org_name AS org_bureau,
    org_div.org_name AS org_division,
    NULL AS org_subdivision,
    org_dep.org_name AS org_department,
    org_min.org_name AS org_ministry,
    
    -- Prior Snapshot
    dtl.cmd_position AS cmd_position,
    dtl.cmd_level AS cmd_level,
    dtl.cmd_org1 AS cmd_org1, -- กระทรวงเดิม
    dtl.cmd_org2 AS cmd_org2, -- กรมเดิม
    dtl.cmd_org3 AS cmd_org3, -- สำนัก/กองเดิม
    dtl.cmd_org4 AS cmd_org4, -- ฝ่ายเดิม
    dtl.cmd_org5 AS cmd_org5,
    dtl.cmd_note1 AS note
FROM per_command cmd
JOIN per_comdtl dtl ON cmd.com_id = dtl.com_id
JOIN per_personal p ON dtl.per_id = p.per_id
LEFT JOIN per_position pos ON dtl.pos_id = pos.pos_id
LEFT JOIN per_line pl ON dtl.pl_code = pl.pl_code
LEFT JOIN per_level lvl ON dtl.level_no = lvl.level_no
LEFT JOIN per_type pt ON pos.pt_code = pt.pt_code
LEFT JOIN per_org org_bur ON cmd.org_id = org_bur.org_id
LEFT JOIN per_org org_div ON org_bur.department_id = org_div.org_id
LEFT JOIN per_org org_dep ON cmd.department_id = org_dep.org_id
LEFT JOIN per_org org_min ON org_dep.department_id = org_min.org_id;

-- ----------------------------------------------------------------------------
-- 3. View: VW_DPIS_SALARY_DETECH_SALARY_HISTORY (ประวัติเงินเดือน)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `vw_dpis_salary_detech_salary_history` AS
SELECT
    sah.sah_id AS source_id,
    p.per_cardno AS per_cardno,
    sah.sah_effectivedate AS effective_date,
    sah.sah_salary AS salary,
    sah.sah_salary_extra AS special_compensation,
    sah.sah_docno AS order_no,
    sah.sah_docdate AS issue_date,
    sah.mov_code AS movement_code,
    sah.sah_percent_up AS percent_up
FROM per_salaryhis sah
JOIN per_personal p ON sah.per_id = p.per_id;
