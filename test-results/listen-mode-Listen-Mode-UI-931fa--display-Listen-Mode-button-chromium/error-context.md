# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e6]: "Y"
    - heading "YoyoPod" [level=3] [ref=e7]
    - paragraph [ref=e8]: Parent Dashboard
  - generic [ref=e9]:
    - generic [ref=e10]:
      - generic [ref=e11]:
        - text: Username
        - textbox "Username" [ref=e12]:
          - /placeholder: parent
          - text: parent
      - generic [ref=e13]:
        - text: Password
        - textbox "Password" [ref=e14]:
          - /placeholder: Enter your password
      - generic [ref=e15]:
        - checkbox "Show password" [ref=e16]
        - generic [ref=e17] [cursor=pointer]: Show password
      - button "Sign In" [ref=e18] [cursor=pointer]
    - paragraph [ref=e20]:
      - text: "Default password:"
      - code [ref=e21]: yoyopod2024
```