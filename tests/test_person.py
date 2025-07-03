import pytest
import sys
import os

# テスト対象のモジュールをインポートできるようにパスを追加
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.person import Person


class TestPerson:
    """Personクラスのテスト"""
    
    def test_valid_person_creation(self):
        """正常なPersonインスタンスの作成"""
        person = Person(name="山田太郎", age=30)
        assert person.name == "山田太郎"
        assert person.age == 30
    
    def test_string_representation(self):
        """文字列表現のテスト"""
        person = Person(name="鈴木花子", age=25)
        assert str(person) == "鈴木花子 (25歳)"
    
    def test_repr_representation(self):
        """repr表現のテスト"""
        person = Person(name="佐藤一郎", age=40)
        assert repr(person) == "Person(name='佐藤一郎', age=40)"
    
    # 名前の検証テスト
    def test_empty_name_raises_error(self):
        """空の名前でエラーが発生することを確認"""
        with pytest.raises(ValueError, match="名前は必須です"):
            Person(name="", age=30)
    
    def test_whitespace_only_name_raises_error(self):
        """空白のみの名前でエラーが発生することを確認"""
        with pytest.raises(ValueError, match="名前は空文字列にできません"):
            Person(name="   ", age=30)
    
    def test_long_name_raises_error(self):
        """長すぎる名前でエラーが発生することを確認"""
        long_name = "あ" * 101
        with pytest.raises(ValueError, match="名前は100文字以内である必要があります"):
            Person(name=long_name, age=30)
    
    def test_non_string_name_raises_error(self):
        """文字列以外の名前でエラーが発生することを確認"""
        with pytest.raises(TypeError, match="名前は文字列である必要があります"):
            Person(name=123, age=30)
    
    # 年齢の検証テスト
    def test_negative_age_raises_error(self):
        """負の年齢でエラーが発生することを確認"""
        with pytest.raises(ValueError, match="年齢は0以上である必要があります"):
            Person(name="田中太郎", age=-1)
    
    def test_too_old_age_raises_error(self):
        """高すぎる年齢でエラーが発生することを確認"""
        with pytest.raises(ValueError, match="年齢は150以下である必要があります"):
            Person(name="田中太郎", age=151)
    
    def test_non_integer_age_raises_error(self):
        """整数以外の年齢でエラーが発生することを確認"""
        with pytest.raises(TypeError, match="年齢は整数である必要があります"):
            Person(name="田中太郎", age="30")
    
    def test_float_age_raises_error(self):
        """浮動小数点の年齢でエラーが発生することを確認"""
        with pytest.raises(TypeError, match="年齢は整数である必要があります"):
            Person(name="田中太郎", age=30.5)
    
    # エッジケースのテスト
    def test_zero_age_is_valid(self):
        """0歳が有効であることを確認"""
        person = Person(name="赤ちゃん", age=0)
        assert person.age == 0
    
    def test_150_age_is_valid(self):
        """150歳が有効であることを確認"""
        person = Person(name="長寿の方", age=150)
        assert person.age == 150
    
    def test_100_character_name_is_valid(self):
        """100文字の名前が有効であることを確認"""
        name = "あ" * 100
        person = Person(name=name, age=30)
        assert len(person.name) == 100