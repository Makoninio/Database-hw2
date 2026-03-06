import mysql from "mysql2";

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const promiseConnection = connection.promise();

function connect() {
  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        console.error("MySQL connection error:", err.message);
        reject(err);
        return;
      }

      console.log("Connected to MySQL");
      resolve();
    });
  });
}

const REPORT_SQL = {
  deliverable1: `
    SELECT 
        s.firstname,
        s.lastname,
        COUNT(*) AS absences
    FROM senator s
    JOIN voted v ON s.id = v.sen_id
    WHERE v.vote = 'A'
    GROUP BY s.id, s.firstname, s.lastname;
  `,
  deliverable2: `
    SELECT 
        s.firstname,
        s.lastname,
        COALESCE(r.absences, 0) AS absences
    FROM senator s
    LEFT JOIN (
        SELECT 
            s.id,
            COUNT(*) AS absences
        FROM senator s
        JOIN voted v ON s.id = v.sen_id
        WHERE v.vote = 'A'
        GROUP BY s.id
    ) r ON s.id = r.id
    ORDER BY absences DESC, s.lastname ASC;
  `,
  deliverable3: `
    SELECT 
        COUNT(*) AS number_of_agreements
    FROM (
        SELECT vote, sen_id, congress, session, number
        FROM voted
        WHERE sen_id = 'S118'
    ) x
    JOIN (
        SELECT vote, sen_id, congress, session, number
        FROM voted
        WHERE sen_id = 'S275'
    ) y
      ON x.congress = y.congress
     AND x.session  = y.session
     AND x.number   = y.number
    WHERE x.vote = y.vote;
  `,
  deliverable4: `
    SELECT 
        COUNT(*) AS number_of_disagreements
    FROM (
        SELECT vote, sen_id, congress, session, number
        FROM voted
        WHERE sen_id = 'S118'
    ) x
    JOIN (
        SELECT vote, sen_id, congress, session, number
        FROM voted
        WHERE sen_id = 'S275'
    ) y
      ON x.congress = y.congress
     AND x.session  = y.session
     AND x.number   = y.number
    WHERE x.vote <> y.vote;
  `,
  deliverable5: `
    SELECT 
        y.sen_id,
        COUNT(*) AS number_of_disagreements
    FROM (
        SELECT vote, sen_id, congress, session, number
        FROM voted
        WHERE sen_id = 'S118'
    ) x
    JOIN voted y
      ON x.congress = y.congress
     AND x.session  = y.session
     AND x.number   = y.number
    WHERE x.vote <> y.vote
      AND x.vote <> 'A'
      AND y.vote <> 'A'
    GROUP BY y.sen_id
    ORDER BY y.sen_id;
  `,
  deliverable6: `
    SELECT
        *,
        (agreements - disagreements) / (agreements + disagreements) AS agreement_index
    FROM (
        SELECT
            firstname,
            lastname,
            's247' AS senator_p,
            party,
            COALESCE(number_of_disagreements, 0) AS disagreements
        FROM (
            SELECT
                firstname,
                lastname,
                id AS other_senator,
                's247' AS senator_p,
                party
            FROM senator
        ) AS s
        NATURAL LEFT OUTER JOIN (
            SELECT
                y.sen_id AS other_senator,
                p.sen_id AS senator_p,
                COUNT(*) AS number_of_disagreements
            FROM (
                SELECT vote, sen_id, congress, session, number
                FROM voted
                WHERE voted.sen_id = 'S247'
            ) AS p
            JOIN (
                SELECT vote, sen_id, congress, session, number
                FROM voted
            ) AS y
              ON p.congress = y.congress
             AND p.session = y.session
             AND p.number = y.number
            WHERE p.vote != y.vote
              AND p.vote != 'A'
              AND y.vote != 'A'
            GROUP BY y.sen_id
            ORDER BY y.sen_id
        ) AS d
    ) AS dis
    NATURAL JOIN (
        SELECT
            firstname,
            lastname,
            's247' AS senator_p,
            COALESCE(number_of_agreements, 0) AS agreements
        FROM (
            SELECT
                firstname,
                lastname,
                id AS other_senator,
                's247' AS senator_p
            FROM senator
        ) AS s
        NATURAL LEFT OUTER JOIN (
            SELECT
                y.sen_id AS other_senator,
                p.sen_id AS senator_p,
                COUNT(*) AS number_of_agreements
            FROM (
                SELECT vote, sen_id, congress, session, number
                FROM voted
                WHERE voted.sen_id = 'S247'
            ) AS p
            JOIN (
                SELECT vote, sen_id, congress, session, number
                FROM voted
            ) AS y
              ON p.congress = y.congress
             AND p.session = y.session
             AND p.number = y.number
            WHERE p.vote = y.vote
              AND p.vote != 'A'
              AND y.vote != 'A'
            GROUP BY y.sen_id
            ORDER BY y.sen_id
        ) AS a
    ) AS agr;
  `
};

function listReports() {
  return Object.keys(REPORT_SQL);
}

async function queryReport(reportName) {
  if (!(reportName in REPORT_SQL)) {
    throw new Error(`Invalid report: ${reportName}`);
  }
  const [rows] = await promiseConnection.query(REPORT_SQL[reportName]);
  return rows;
}

export { connect, queryReport, listReports };
