import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSgmsSchema1795564800000 implements MigrationInterface {
  name = 'InitialSgmsSchema1795564800000';
  // MariaDB DDL implicitly commits; do not suggest that DDL rollback is atomic.
  transaction = false;

  async up(runner: QueryRunner): Promise<void> {
    const [target] = await runner.query('SELECT DATABASE() AS db');
    if (target.db !== 'student_grade_monitoring_db') {
      throw new Error('Migration refused: unexpected database.');
    }
    await runner.query(`CREATE TABLE users (
      user_id INT NOT NULL AUTO_INCREMENT,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL,
      account_status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id), UNIQUE KEY uq_users_email (email),
      CONSTRAINT chk_user_role CHECK (role IN ('Student','Faculty','Admin','Department Head')),
      CONSTRAINT chk_account_status CHECK (account_status IN ('Active','Inactive'))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE subjects (
      subject_id INT NOT NULL AUTO_INCREMENT,
      subject_code VARCHAR(20) NOT NULL,
      subject_name VARCHAR(100) NOT NULL,
      units INT NOT NULL,
      faculty_id INT NOT NULL,
      PRIMARY KEY (subject_id), UNIQUE KEY uq_subjects_code (subject_code),
      KEY idx_subjects_faculty (faculty_id),
      CONSTRAINT chk_subject_units CHECK (units > 0),
      CONSTRAINT fk_subjects_faculty_id FOREIGN KEY (faculty_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE enrollments (
      enrollment_id INT NOT NULL AUTO_INCREMENT,
      student_id INT NOT NULL, subject_id INT NOT NULL,
      semester VARCHAR(20) NOT NULL,
      school_year VARCHAR(9) NOT NULL,
      date_enrolled DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Enrolled',
      PRIMARY KEY (enrollment_id),
      UNIQUE KEY uq_enrollment_term (student_id, subject_id, semester, school_year),
      KEY idx_enrollments_subject (subject_id),
      CONSTRAINT chk_enrollment_status CHECK (status IN ('Enrolled','Dropped','Completed')),
      CONSTRAINT chk_semester CHECK (CHAR_LENGTH(TRIM(semester)) > 0),
      CONSTRAINT chk_school_year CHECK (
        school_year REGEXP '^[0-9]{4}-[0-9]{4}$'
        AND CAST(SUBSTRING(school_year,6,4) AS UNSIGNED) = CAST(SUBSTRING(school_year,1,4) AS UNSIGNED) + 1
      ),
      CONSTRAINT fk_enrollments_student_id FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT fk_enrollments_subject_id FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE grades (
      grade_id INT NOT NULL AUTO_INCREMENT, enrollment_id INT NOT NULL,
      grade_type VARCHAR(20) NOT NULL, score DECIMAL(5,2) NOT NULL,
      remarks VARCHAR(30) NULL,
      date_recorded DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (grade_id), UNIQUE KEY uq_grade_type (enrollment_id, grade_type),
      CONSTRAINT chk_grade_type CHECK (grade_type IN ('Midterm','Final')),
      CONSTRAINT chk_grade_score CHECK (score >= 0 AND score <= 100),
      CONSTRAINT fk_grades_enrollment_id FOREIGN KEY (enrollment_id) REFERENCES enrollments(enrollment_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE grade_inquiries (
      inquiry_id INT NOT NULL AUTO_INCREMENT, grade_id INT NOT NULL,
      student_id INT NOT NULL, message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      date_submitted DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_by INT NULL, resolution_note TEXT NULL, date_resolved DATETIME NULL,
      PRIMARY KEY (inquiry_id),
      KEY idx_inquiries_grade (grade_id), KEY idx_inquiries_student (student_id),
      KEY idx_inquiries_resolver (resolved_by), KEY idx_inquiries_status (status),
      CONSTRAINT chk_inquiry_status CHECK (status IN ('Pending','Resolved')),
      CONSTRAINT chk_inquiry_message CHECK (CHAR_LENGTH(TRIM(message)) > 0),
      CONSTRAINT chk_inquiry_resolution CHECK (
        (status = 'Pending' AND resolved_by IS NULL AND resolution_note IS NULL AND date_resolved IS NULL)
        OR (status = 'Resolved' AND resolved_by IS NOT NULL AND resolution_note IS NOT NULL
          AND CHAR_LENGTH(TRIM(resolution_note)) > 0 AND date_resolved IS NOT NULL
          AND date_resolved >= date_submitted)
      ),
      CONSTRAINT fk_grade_inquiries_grade_id FOREIGN KEY (grade_id) REFERENCES grades(grade_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT fk_grade_inquiries_student_id FOREIGN KEY (student_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
      CONSTRAINT fk_grade_inquiries_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await runner.query(`CREATE TABLE audit_logs (
      audit_id INT NOT NULL AUTO_INCREMENT, user_id INT NOT NULL,
      action VARCHAR(100) NOT NULL, table_affected VARCHAR(50) NOT NULL,
      record_id INT NULL, action_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (audit_id), KEY idx_audit_user_time (user_id, action_timestamp),
      KEY idx_audit_record (table_affected, record_id),
      CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  async down(): Promise<void> {
    // Academic history must never be removed by an accidental migration revert.
    throw new Error(
      'Destructive rollback is disabled. Use an approved forward migration.',
    );
  }
}
