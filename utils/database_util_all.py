from datetime import datetime
import os
import mysql.connector
import pandas as pd
from dotenv import load_dotenv
import argparse

# .env 파일 로드
load_dotenv()

# .env 파일에서 데이터베이스 설정 읽기
db_config = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PWD'),
    'host': os.getenv('DB_HOST'),
    'database': os.getenv('DB_NAME'),
    'port': os.getenv('DB_PORT'),
}
print(db_config)



def export_tables_to_csv(output_dir):
    """
    MySQL 데이터베이스의 모든 테이블을 CSV 파일로 내보냅니다.
    """
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    cursor.execute("SHOW TABLES")
    tables = cursor.fetchall()

    for table_name in tables:
        table_name = table_name[0]
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        columns = [i[0] for i in cursor.description]

        df = pd.DataFrame(rows, columns=columns)
        df.to_csv(os.path.join(output_dir, f"{table_name}.csv"), index=False, encoding='utf-8') 
        print(f"Table {table_name} exported to {os.path.join(output_dir, f'{table_name}.csv')}")

    cursor.close()
    connection.close()

def import_csv_to_tables(input_dir, priority):
    """
    CSV 파일을 MySQL 테이블로 가져옵니다.
    """
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()

    csv_files = [f for f in os.listdir(input_dir) if f.endswith('.csv')]

    for csv_file in priority:
        csv_file = csv_file+".csv"
        table_name = os.path.splitext(csv_file)[0]
        file_path = os.path.join(input_dir, csv_file)
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
            print(f"Uploading {csv_file} to {table_name} table...")

            # pandas가 pin 컬럼을 숫자로 오인식해 앞자리 0을 지우는 문제 복구
            if table_name == "passpin" and "pin" in df.columns:
                df["pin"] = df["pin"].apply(
                    lambda v: str(v).zfill(6) if pd.notnull(v) else v
                )

            # NaN 값을 None으로 변환
            df = df.astype(object).where(pd.notnull(df), None)

            # 테이블 컬럼 가져오기
            columns = ', '.join(df.columns)
            placeholders = ', '.join(['%s'] * len(df.columns))  # %s placeholder 생성
            insert_query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

            # 데이터 삽입
            for _, row in df.iterrows():
                #print(row.values)
                try:
                    cursor.execute(insert_query, tuple(row.values))  # 이미 None으로 변환된 값 사용
                except mysql.connector.Error as err:
                    print(f"Error: {err}")
                    print(f"Error data: {row.values}")
                    connection.rollback()  # 트랜잭션 롤백
                    continue
            connection.commit()
            print(f"Data from {csv_file} uploaded to {table_name} table.")
            input(f"Press Enter to continue...")
        except:
            print(f"{csv_file} not found")

    cursor.close()
    connection.close()


def import_csv_to_table(csv_file, table_name):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()

    file_path = os.path.join(csv_file)
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
        print(f"Uploading {csv_file} to {table_name} table...")

        # pandas가 pin 컬럼을 숫자로 오인식해 앞자리 0을 지우는 문제 복구
        if table_name == "passpin" and "pin" in df.columns:
            df["pin"] = df["pin"].apply(
                lambda v: str(v).zfill(6) if pd.notnull(v) else v
            )

        # NaN 값을 None으로 변환
        df = df.astype(object).where(pd.notnull(df), None)

        # 테이블 컬럼 가져오기
        columns = ', '.join(df.columns)
        placeholders = ', '.join(['%s'] * len(df.columns))  # %s placeholder 생성
        insert_query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"

        # 데이터 삽입
        for _, row in df.iterrows():
            #print(row.values)
            try:
                cursor.execute(insert_query, tuple(row.values))  # 이미 None으로 변환된 값 사용
            except mysql.connector.Error as err:
                print(f"Error: {err}")
                print(f"Error data: {row.values}")
                connection.rollback()  # 트랜잭션 롤백
                continue
        connection.commit()
        print(f"Data from {csv_file} uploaded to {table_name} table.")
        input(f"Press Enter to continue...")
    except:
        print(f"{csv_file} not found")

    cursor.close()
    connection.close()

def drop_tables_priority(priority):
    connection = mysql.connector.connect(**db_config)
    cursor = connection.cursor()
    input("drop table")

    for table in priority:
        print(table)
        cursor.execute(f"DROP TABLE IF EXISTS {table}")

    connection.commit()

    cursor.close()
    connection.close()

def main():
    # export reservation table
    today_str = datetime.now().strftime("%Y-%m-%d")
    folder_path = os.path.join(os.getcwd(),today_str)
    os.makedirs(folder_path,exist_ok=True)


    priority = [
        "user",
        "organization",
        "organization_member",
        "space",
        "reservation",
        "reservation_content",

        "p_lottery_info",
        "p_lottery",
        "qna",
        "rule",
        "business",
        "goods",
        "notice",
        "rental",
        "s_lottery_info",
        "s_lottery",
        "passpin",
        "match_info",
        "match_prediction"
    ]
    # export_tables_to_csv(folder_path)

    # drop_tables_priority(priority[::-1])

    import_csv_to_tables(folder_path, priority)
    # import_csv_to_table("./new_dataset/new_reservation_content.csv", "reservation_content")

if __name__ == "__main__":
    main()

## db to CSV
# python3 database_utils.py --export --dir=./exported_csv_files
## CSV to db
# python3 database_utils.py --import --dir=./import_csv_files

# 파일 폴더에서
# scp -i ../2024SCSpace.pem -r ubuntu@3.36.210.28:~/scspace/exported_csv_files ./exported_csv_files
