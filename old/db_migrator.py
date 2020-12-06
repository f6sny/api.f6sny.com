import mysql.connector
from datetime import datetime

# To migrate the old F6sny DB into the new structure

source_db = mysql.connector.connect(
  host="localhost",
  user="root",
  password="",
  database="f6sny_original"
)

dest_db = mysql.connector.connect(
  host="localhost",
  user="root",
  password="",
  database="f6sny_strapi"
)

source_db_c = source_db.cursor()
dest_db_c = dest_db.cursor()

# Get All Jokes from Source
def get_jokes():
  source_db_c.execute("SELECT id, title, content, date_added, user_id, status_id, date_modified FROM posts")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from jokes")
  dest_db_c.execute("ALTER TABLE jokes AUTO_INCREMENT = 1")

  for (id, title, content, date_added, user_id, status_id, date_modified) in myresult:
    sql = "insert into jokes (id, author,   content,  publish_at,  created_at,   status,   moderated_up, moderated_down, updated_at) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
    status = "pending"
    if status_id == 1:
        status = "community_approved"
    elif status_id == 3:
        status = "community_rejected"


    val = (id, user_id, content, date_added, date_added, status, 0, 0, date_modified)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    print(dest_db_c.rowcount, "record inserted.")

# Get tags
def get_tags():
  source_db_c.execute("SELECT id, title, slug, description, filtered, fore_color FROM tags")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from tags")
  dest_db_c.execute("ALTER TABLE tags AUTO_INCREMENT = 1")

  for (id, title, slug, description, filtered, fore_color) in myresult:
    filtered = 1 - filtered
    title = title.replace('#','')
    sql = "insert into tags (id, name, visible, description, fore_color ) values (%s, %s, %s, %s, %s)"
    val = (id, title, filtered, description, fore_color)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    print(dest_db_c.rowcount, "tag record inserted.")




# get jokes tags
def get_jokes_tags():
  source_db_c.execute("SELECT id, resource_id, tag_id FROM tags_relations where resource_type=2")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from jokes_tags__tags_jokes")
  dest_db_c.execute("ALTER TABLE jokes_tags__tags_jokes AUTO_INCREMENT = 1")

  for (id, resource_id, tag_id) in myresult:
    sql = "insert into jokes_tags__tags_jokes (id, joke_id, tag_id) values (%s, %s, %s)"
    val = (id, resource_id, tag_id)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    print(dest_db_c.rowcount, "tag_relations record inserted.")

# Get All Jokes Moderations from Source
def get_joke_moderations():
  source_db_c.execute("SELECT id, post_id, ip_address, date_added, user_id FROM posts_moderation")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from joke_moderations")
  dest_db_c.execute("ALTER TABLE joke_moderations AUTO_INCREMENT = 1")

  counter = 1
  for (id, post_id, ip_address, date_added, user_id) in myresult:
    sql = "insert into joke_moderations (id, joke_id, ip_address, users_permissions_user, created_at, updated_at) values (%s, %s, %s, %s, %s, %s)"
    val = (id, post_id, ip_address, user_id, date_added, date_added)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    
    print(counter, " out of ", len(myresult), " joke_moderations record inserted.")
    counter = counter + 1

# Get All users from Source
def get_users():
  source_db_c.execute("select users.id as id, ip_address, username, password, email, active, created_on, first_name, last_name, date_of_birth, bio, gender, adult_content from users join meta on users.id = meta.user_id")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from `users-permissions_user`")
  dest_db_c.execute("ALTER TABLE `users-permissions_user` AUTO_INCREMENT = 1")

  for (id, ip_address, username, password, email, active, created_on, first_name, last_name, date_of_birth, bio, gender, adult_content) in myresult:
      if gender is None:
        gender = 1
      if adult_content is None:
        adult_content = 0
      sql = "insert into `users-permissions_user` (id, username, email, provider, password, confirmed, blocked, role, created_by, created_at, updated_at, birthday, firstname, lastname, gender, bio, ip_address, adult_content) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
      val = (id, username, email, 'local', password, 1, 0, 1, 1, created_on, created_on, date_of_birth, first_name, last_name, gender, bio, ip_address, adult_content)
      dest_db_c.execute(sql, val)
      dest_db.commit()
      print(dest_db_c.rowcount, "users inserted.")

def get_comments():
  source_db_c.execute("select id, content, date_added, resource_id, user_id, status_id from replies where resource_type = 2")
  myresult = source_db_c.fetchall()

  # delete all
  dest_db_c.execute("delete from jokes__comments")
  dest_db_c.execute("ALTER TABLE jokes__comments AUTO_INCREMENT = 1")
  dest_db_c.execute("delete from comments")
  dest_db_c.execute("ALTER TABLE comments AUTO_INCREMENT = 1")

  counter = 1
  for (id, content, date_added, resource_id, user_id, status_id) in myresult:
    sql = "insert into comments (id, content, created_by, created_at, updated_at, author, status) values (%s, %s, %s, %s, %s, %s, %s)"
    if status_id != 1:
      status_id = 0
    val = (id, content, user_id, date_added, date_added, user_id, status_id)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    sql = "insert into jokes__comments (joke_id, comment_id) values (%s, %s)"
    val = (resource_id, id)
    dest_db_c.execute(sql, val)
    dest_db.commit()
    print(counter, " out of ", len(myresult), " jokes__comments record inserted.")
    counter = counter + 1

get_jokes()
get_tags()
get_jokes_tags()
get_joke_moderations()
get_users()
get_comments()