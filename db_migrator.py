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
    source_db_c.execute(
        "SELECT id, title, content, date_added, user_id, status_id, date_modified, slug FROM posts")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from jokes")
    dest_db_c.execute("ALTER TABLE jokes AUTO_INCREMENT = 1")

    for (id, title, content, date_added, user_id, status_id, date_modified, slug) in myresult:
        sql = "insert into jokes (id, content, status, slug, created_by, updated_by, created_at, updated_at) values (%s, %s, %s, %s, %s, %s, %s, %s)"
        status = "pending"
        if status_id == 1:
            status = "approved"
        elif status_id == 3:
            status = "deleted"

        val = (id, content, status, slug, user_id,
               user_id, date_added, date_added,)
        dest_db_c.execute(sql, val)
        dest_db.commit()
    print("jokes inserted.")

# Get tags


def get_tags():
    source_db_c.execute(
        "SELECT id, title, slug, description, filtered, fore_color, slug FROM tags")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from tags")
    dest_db_c.execute("ALTER TABLE tags AUTO_INCREMENT = 1")

    for (id, title, slug, description, filtered, fore_color, slug) in myresult:
        # filtered = 1 - filtered
        title = title.replace('#', '')
        sql = "insert into tags (id, title, description, adult_content, hex_color, slug) values (%s, %s, %s, %s, %s, %s)"
        val = (id, title, description, filtered, fore_color, slug)
        dest_db_c.execute(sql, val)
        dest_db.commit()
    print("tag record inserted.")

# get jokes tags


def get_jokes_tags():
    source_db_c.execute(
        "SELECT id, resource_id, tag_id FROM tags_relations where resource_type=2")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from jokes_tags__tags_jokes")
    dest_db_c.execute("ALTER TABLE jokes_tags__tags_jokes AUTO_INCREMENT = 1")

    for (id, resource_id, tag_id) in myresult:
        sql = "insert into jokes_tags__tags_jokes (id, joke_id, tag_id) values (%s, %s, %s)"
        val = (id, resource_id, tag_id)
        dest_db_c.execute(sql, val)
        dest_db.commit()
    print("tag_relations record inserted.")

# Get All Jokes Moderations from Source


def get_joke_votes():
    source_db_c.execute(
        "SELECT id, `value`, resource_id, date_added, user_id FROM votes  where resource_type = 2")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from jokes__votes")
    dest_db_c.execute("ALTER TABLE jokes__votes AUTO_INCREMENT = 1")
    dest_db_c.execute("delete from votes")
    dest_db_c.execute("ALTER TABLE votes AUTO_INCREMENT = 1")

    for (id, value, resource_id, date_added, user_id) in myresult:
        vote_value = "up"
        if value == -1:
            vote_value = "down"

        sql = "insert into votes (id, value, created_by, updated_by, created_at, updated_at) values (%s, %s, %s, %s, %s, %s)"
        sql2 = "insert into jokes__votes (joke_id, vote_id) values (%s, %s)"
        val = (id, vote_value, user_id, user_id, date_added, date_added)
        val2 = (resource_id, id)

        dest_db_c.execute(sql, val)
        dest_db.commit()
        dest_db_c.execute(sql2, val2)
        dest_db.commit()
    print("votes inserted.")

# Get All users from Source


def get_users():
    source_db_c.execute("select users.id as id, ip_address, username, password, email, active, created_on, first_name, last_name, date_of_birth, bio, gender, adult_content from users join meta on users.id = meta.user_id")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from `users-permissions_user`")
    dest_db_c.execute(
        "ALTER TABLE `users-permissions_user` AUTO_INCREMENT = 1")

    for (id, ip_address, username, password, email, active, created_on, first_name, last_name, date_of_birth, bio, gender, adult_content) in myresult:
        if gender is None:
            gender = "male"
        elif gender == 1:
            gender = "male"
        else:
            gender = "female"

        if adult_content == 1:
            adult_content = "show"
        else:
            adult_content = "hide"

        sql = "insert into `users-permissions_user` (id, username, email, provider, password, confirmed, blocked, role, created_by, created_at, updated_at, date_of_birth, first_name, last_name, gender, biography, ip_address, adult_content) values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"
        val = (id, username, email, 'local', password, 1, 0, 1, 1, created_on, created_on,
               date_of_birth, first_name, last_name, gender, bio, ip_address, adult_content)
        dest_db_c.execute(sql, val)
        dest_db.commit()
    print("users inserted.")


def get_comments():
    source_db_c.execute(
        "select id, content, date_added, resource_id, user_id, author, author_email from replies where resource_type = 2")
    myresult = source_db_c.fetchall()

    # delete all
    dest_db_c.execute("delete from comments")
    dest_db_c.execute("ALTER TABLE comments AUTO_INCREMENT = 1")
    dest_db_c.execute("delete from comments_morph")
    dest_db_c.execute("ALTER TABLE comments_morph AUTO_INCREMENT = 1")

    counter = 1
    for (id, content, date_added, resource_id, user_id, author, author_email) in myresult:
        sql = "insert into comments (`id`, content, authorUser, authorName, authorEmail, relatedSlug, created_at, updated_at) values (%s, %s, %s, %s, %s, %s, %s, %s)"
        sql2 = "insert into comments_morph (comments_id, related_id, related_type, `field`, `order`) values (%s, %s, %s, %s, %s)"

        if int(user_id) < 1:
            user_id = "NULL"

        related_slug = "jokes:" + str(resource_id)
        val = (id, content, user_id, author, author_email, related_slug, date_added, date_added)
        val2 = (id, resource_id, "jokes", "comments", counter)

        counter = counter + 1

        dest_db_c.execute(sql, val)
        dest_db.commit()
        
        dest_db_c.execute(sql2, val2)
        dest_db.commit()

    print("comment record inserted.")


# get_jokes()
# get_tags()
# get_jokes_tags()
# get_joke_votes()
# get_users()
get_comments()
