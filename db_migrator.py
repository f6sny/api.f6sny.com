import mysql.connector
from datetime import datetime



# To migrate the old F6sny DB into the new structure

source_db = mysql.connector.connect(
  host="localhost",
  user="root",
  password="",
  database="f6sny_old_jokes"
)

dest_db = mysql.connector.connect(
  host="localhost",
  user="root",
  password="",
  database="f6sny_strapi"
)

source_db_c = source_db.cursor()
dest_db_c = dest_db.cursor()



################################
# Get All Jokes from Source
################################
source_db_c.execute("SELECT PID,  USERID,   story,    category,     time_added,   active,   mod_yes,      mod_no, pip FROM posts")

myresult = source_db_c.fetchall()

# delete all
dest_db_c.execute("delete from jokes")
dest_db_c.execute("ALTER TABLE jokes AUTO_INCREMENT = 1")
for x in myresult:
  sql = "insert into jokes (id, author,   content,  publish_at,  created_at,   status,   moderated_up, moderated_down, updated_at, ip_address) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
  status = "pending"
  if not (x[6] < 10 and x[7] < 10):
      if x[6] >= x[7]:
          status = "community_approved"
      else:
          status = "community_rejected"

  val = (x[0], x[1], x[2], datetime.fromtimestamp(float(x[4])).isoformat(), datetime.fromtimestamp(float(x[4])).isoformat(), status, x[6], x[7], datetime.fromtimestamp(float(x[4])).isoformat(), x[8])
  dest_db_c.execute(sql, val)
  dest_db.commit()
  print(dest_db_c.rowcount, "record inserted.")

# delete all
dest_db_c.execute("delete from jokes_tags__tags_jokes")
dest_db_c.execute("ALTER TABLE jokes_tags__tags_jokes AUTO_INCREMENT = 1")


count = 1;
for x in myresult:
  sql = "insert into jokes_tags__tags_jokes (id, joke_id, tag_id) values (%s, %s, %s)"
  val = (count, x[0], x[3])
  dest_db_c.execute(sql, val)
  dest_db.commit()
  print(dest_db_c.rowcount, "tag record inserted.")
  count = count + 1

################################
# Get All users from Source
################################
print('reached here')
source_db_c.execute("SELECT                   USERID,   username,   email,  password, 1,          1,      1,    1,          1,          addtime,    addtime,    birthday,   firstname, lastname, gender, description, ip FROM members")
print('reached here')
myresult = source_db_c.fetchall()
print('reached here')
# delete all
dest_db_c.execute("delete from `users-permissions_user`")
print('reached here')
dest_db_c.execute("ALTER TABLE `users-permissions_user` AUTO_INCREMENT = 1")
print('reached here')
for x in myresult:
    sql = "insert into `users-permissions_user` (id,    username,     email,  password, confirmed,  blocked, role, created_by, updated_by, created_at, updated_at, birthday, firstname, lastname, gender,   bio,      ip_address) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
    created = datetime.fromtimestamp(float(x[9])).isoformat()
    bday = x[11]
    val = (x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], x[8], created, created, bday, x[12], x[13], x[14], x[15], x[16])
    dest_db_c.execute(sql, val)
    dest_db.commit()
    print(dest_db_c.rowcount, "record inserted.")
