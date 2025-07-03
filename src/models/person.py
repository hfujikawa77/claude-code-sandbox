from dataclasses import dataclass


@dataclass
class Person:
    """名前と年齢を保持するデータモデル"""
    
    name: str
    age: int
    
    def __post_init__(self):
        """データ検証を実行"""
        self._validate_name()
        self._validate_age()
    
    def _validate_name(self) -> None:
        """名前の検証"""
        if not self.name:
            raise ValueError("名前は必須です")
        if not isinstance(self.name, str):
            raise TypeError("名前は文字列である必要があります")
        if len(self.name.strip()) == 0:
            raise ValueError("名前は空文字列にできません")
        if len(self.name) > 100:
            raise ValueError("名前は100文字以内である必要があります")
    
    def _validate_age(self) -> None:
        """年齢の検証"""
        if not isinstance(self.age, int):
            raise TypeError("年齢は整数である必要があります")
        if self.age < 0:
            raise ValueError("年齢は0以上である必要があります")
        if self.age > 150:
            raise ValueError("年齢は150以下である必要があります")
    
    def __str__(self) -> str:
        """文字列表現"""
        return f"{self.name} ({self.age}歳)"
    
    def __repr__(self) -> str:
        """デバッグ用表現"""
        return f"Person(name='{self.name}', age={self.age})"