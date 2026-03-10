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
        firstname, 
        lastname, 
        COUNT(*) as Absences 
    FROM senator JOIN voted
    ON senator.id = voted.sen_id
    WHERE vote = 'A'
    GROUP By id
  `,
  deliverable2: `
    SELECT 
        firstname, 
        lastname, 
        COALESCE(Absences, 0) as Absences FROM senator as s
    NATURAL LEFT OUTER JOIN (
      SELECT firstname, lastname, COUNT(*) as Absences from senator JOIN voted
      ON senator.id = voted.sen_id
      WHERE vote = 'A'
      GROUP By id
    ) AS a;
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
    SELECT Count(*) as number_of_disagreements
    FROM (
        SELECT vote, sen_id, congress, session, number 
        FROM voted 
        WHERE voted.sen_id='S118'
    ) AS x
    JOIN (
        SELECT vote, sen_id, congress, session, number 
        FROM voted 
        WHERE voted.sen_id='S275'
    ) AS y
      ON x.congress = y.congress 
      AND x.session = y.session 
      AND x.number = y.number
    WHERE x.vote != y.vote;
  `,
  deliverable5: `
    Select 
        senator y, 
        's118' as senator x, 
        COALESCE(number of disagreements, 0) as number of disagreements 
    FROM (
        SELECT 
            id as senator_y, 
            's118' as senator_x 
        FROM senator
      ) AS s
    NATURAL LEFT OUTER JOIN (
        SELECT 
            y.sen_id as senator_y, 
            x.sen_id as senator_x, 
            Count(*) as number_of_disagreements
        FROM (
            SELECT vote, sen_id, congress, session, number 
            FROM voted where voted.sen_id='S118'
        ) AS x
    JOIN (
        SELECT vote, sen_id, congress, session, number 
        FROM voted
    ) AS y
    ON x.congress = y.congress 
    AND x.session = y.session 
    AND x.number = y.number
    WHERE x.vote != y.vote AND x.vote != 'A' AND y.vote != 'A'
    group by y.sen_id) as d;
  `,
  deliverable6: `
    SELECT
        *,
        COALESCE((agreements - disagreements) / (agreements + disagreements), 0) AS agreement_index
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
    ) AS agr
     ORDER BY agreement_index DESC;
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
