import sys
import os

# テスト対象のモジュールをインポートできるようにパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.person import Person


def test_valid_person_creation():
    """正常なPersonインスタンスの作成"""
    try:
        person = Person(name="山田太郎", age=30)
        assert person.name == "山田太郎"
        assert person.age == 30
        print("✓ 正常なPersonインスタンスの作成: OK")
    except Exception as e:
        print(f"✗ 正常なPersonインスタンスの作成: FAILED - {e}")


def test_string_representation():
    """文字列表現のテスト"""
    try:
        person = Person(name="鈴木花子", age=25)
        assert str(person) == "鈴木花子 (25歳)"
        print("✓ 文字列表現のテスト: OK")
    except Exception as e:
        print(f"✗ 文字列表現のテスト: FAILED - {e}")


def test_empty_name_raises_error():
    """空の名前でエラーが発生することを確認"""
    try:
        Person(name="", age=30)
        print("✗ 空の名前でエラーが発生することを確認: FAILED - エラーが発生しませんでした")
    except ValueError as e:
        if "名前は必須です" in str(e):
            print("✓ 空の名前でエラーが発生することを確認: OK")
        else:
            print(f"✗ 空の名前でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")
    except Exception as e:
        print(f"✗ 空の名前でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")


def test_negative_age_raises_error():
    """負の年齢でエラーが発生することを確認"""
    try:
        Person(name="田中太郎", age=-1)
        print("✗ 負の年齢でエラーが発生することを確認: FAILED - エラーが発生しませんでした")
    except ValueError as e:
        if "年齢は0以上である必要があります" in str(e):
            print("✓ 負の年齢でエラーが発生することを確認: OK")
        else:
            print(f"✗ 負の年齢でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")
    except Exception as e:
        print(f"✗ 負の年齢でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")


def test_too_old_age_raises_error():
    """高すぎる年齢でエラーが発生することを確認"""
    try:
        Person(name="田中太郎", age=151)
        print("✗ 高すぎる年齢でエラーが発生することを確認: FAILED - エラーが発生しませんでした")
    except ValueError as e:
        if "年齢は150以下である必要があります" in str(e):
            print("✓ 高すぎる年齢でエラーが発生することを確認: OK")
        else:
            print(f"✗ 高すぎる年齢でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")
    except Exception as e:
        print(f"✗ 高すぎる年齢でエラーが発生することを確認: FAILED - 予期しないエラー: {e}")


def test_zero_age_is_valid():
    """0歳が有効であることを確認"""
    try:
        person = Person(name="赤ちゃん", age=0)
        assert person.age == 0
        print("✓ 0歳が有効であることを確認: OK")
    except Exception as e:
        print(f"✗ 0歳が有効であることを確認: FAILED - {e}")


def test_150_age_is_valid():
    """150歳が有効であることを確認"""
    try:
        person = Person(name="長寿の方", age=150)
        assert person.age == 150
        print("✓ 150歳が有効であることを確認: OK")
    except Exception as e:
        print(f"✗ 150歳が有効であることを確認: FAILED - {e}")


if __name__ == "__main__":
    print("Personクラスのテストを実行中...\n")
    
    test_valid_person_creation()
    test_string_representation()
    test_empty_name_raises_error()
    test_negative_age_raises_error()
    test_too_old_age_raises_error()
    test_zero_age_is_valid()
    test_150_age_is_valid()
    
    print("\nテスト実行完了")